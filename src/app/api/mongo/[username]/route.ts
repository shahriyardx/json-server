import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  rateLimiter,
  checkAndIncrementRequest,
  isAdminRole,
} from "@/lib/api/usage"
import { corsHeaders } from "@/lib/api/response"
import { applyMongoFilter } from "@/lib/api/mongo-filter"
import { applyMongoUpdate } from "@/lib/api/mongo-update"
import { autoGenerateId } from "@/lib/api/query"
import { verifyPassword, parseBasicAuth } from "@/lib/api/db-auth"

type Operation =
  | "find"
  | "insertOne"
  | "insertMany"
  | "updateOne"
  | "updateMany"
  | "deleteOne"
  | "deleteMany"
  | "countDocuments"
  | "replaceOne"
  | "findOneAndUpdate"
  | "findOneAndDelete"
  | "findOneAndReplace"
  | "bulkWrite"
  | "estimatedDocumentCount"
  | "distinct"
  | "ping"

interface MongoBody {
  database: string
  collection: string
  operation: Operation
  filter?: Record<string, unknown>
  document?: Record<string, unknown>
  documents?: Record<string, unknown>[]
  update?: Record<string, unknown>
  key?: string
  operations?: {
    operation: string
    filter?: Record<string, unknown>
    document?: Record<string, unknown>
    documents?: Record<string, unknown>[]
    update?: Record<string, unknown>
  }[]
  options?: {
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
    projection?: Record<string, 0 | 1>
    upsert?: boolean
    returnDocument?: "before" | "after"
  }
}

const ALLOWED_OPS = new Set<Operation>([
  "find",
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "countDocuments",
  "replaceOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "bulkWrite",
  "estimatedDocumentCount",
  "distinct",
  "ping",
])

function mongoJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

type ParsedDoc = Record<string, unknown> & { __prismaId?: string }

// Load all docs in a collection, parse data JSON, return with __prismaId
async function loadParsedDocs(collectionId: string): Promise<ParsedDoc[]> {
  const records = await prisma.document.findMany({
    where: { collectionId },
    orderBy: { createdAt: "asc" },
  })
  return records.map((r) => {
    const parsed = JSON.parse(r.data) as ParsedDoc
    parsed.__prismaId = r.id
    return parsed
  })
}

// Ensure collection exists, return its id
async function ensureCollection(databaseId: string, name: string): Promise<string> {
  const existing = await prisma.collection.findUnique({
    where: { databaseId_name: { databaseId, name } },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.collection.create({
    data: { databaseId, name },
    select: { id: true },
  })
  return created.id
}

// Save updated doc back to DB (removes __prismaId before serializing)
async function saveDoc(collectionId: string, doc: ParsedDoc): Promise<void> {
  const { __prismaId: prismaId, ...data } = doc
  if (prismaId) {
    await prisma.document.update({
      where: { id: prismaId },
      data: { data: JSON.stringify(data) },
    })
  } else {
    await prisma.document.create({
      data: { collectionId, data: JSON.stringify(data) },
    })
  }
}

async function deleteDoc(prismaId: string | undefined): Promise<void> {
  if (!prismaId) return
  await prisma.document.delete({ where: { id: prismaId } })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  let body: MongoBody
  try {
    body = await req.json()
  } catch {
    return mongoJson({ error: "Invalid JSON body" }, 400)
  }

  if (!body.operation) {
    return mongoJson({ error: "operation is required" }, 400)
  }

  if (!ALLOWED_OPS.has(body.operation)) {
    return mongoJson({ error: `Unknown operation: ${body.operation}` }, 400)
  }

  if (body.operation !== "ping" && (!body.database || !body.collection)) {
    return mongoJson({ error: "database and collection are required" }, 400)
  }

  // Resolve platform user
  const platformUser = await prisma.user.findFirst({
    where: { username },
    select: { id: true, role: true },
  })
  if (!platformUser) return mongoJson({ error: "User not found" }, 404)

  // Auth: Basic only (database user)
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Basic ")) {
    return mongoJson({ error: "Unauthorized" }, 401)
  }

  const parsed = parseBasicAuth(authHeader)
  if (!parsed) {
    return mongoJson({ error: "Invalid Basic auth header" }, 401)
  }

  const dbUser = await prisma.databaseUser.findFirst({
    where: { username: parsed.username, userId: platformUser.id },
    select: { password: true },
  })
  if (!dbUser) {
    return mongoJson({ error: "Unauthorized" }, 401)
  }

  const dbUserAuthed = await verifyPassword(parsed.password, dbUser.password)
  if (!dbUserAuthed) {
    return mongoJson({ error: "Unauthorized" }, 401)
  }

  if (!isAdminRole(platformUser.role)) {
    const { ok: rateOk } = rateLimiter.check(`${username}/${body.database}`)
    if (!rateOk) {
      return mongoJson({ error: "Too many requests" }, 429)
    }
    const withinLimit = await checkAndIncrementRequest(platformUser.id)
    if (!withinLimit)
      return mongoJson({ error: "Monthly request limit exceeded" }, 429)
  }

  // Ping — lightweight connectivity check, no DB/collection needed
  if (body.operation === "ping") {
    return mongoJson({ ok: 1, dbVersion: "8.0.0" })
  }

  // Find or auto-create database
  let db = await prisma.database.findUnique({
    where: { userId_name: { userId: platformUser.id, name: body.database } },
  })
  if (!db) {
    db = await prisma.database.create({
      data: { userId: platformUser.id, name: body.database },
    })
  }

  // Ensure collection exists
  const collectionId = await ensureCollection(db.id, body.collection)

  const filter = body.filter ?? {}
  const options = body.options ?? {}

  switch (body.operation) {
    case "find": {
      let docs = await loadParsedDocs(collectionId)
      let result = applyMongoFilter(docs, filter) as Record<string, unknown>[]

      if (options.sort) {
        const sortEntries = Object.entries(options.sort)
        if (sortEntries.length > 0) {
          const [sortField, sortDir] = sortEntries[0]
          result = [...result].sort((a, b) => {
            const aVal = a[sortField] as string | number
            const bVal = b[sortField] as string | number
            if (aVal < bVal) return -sortDir
            if (aVal > bVal) return sortDir
            return 0
          })
        }
      }

      if (options.skip) result = result.slice(options.skip)
      if (options.limit) result = result.slice(0, options.limit)

      // Strip __prismaId and apply projection
      result = result.map((item) => {
        const { __prismaId, ...rest } = item
        if (!options.projection) return rest

        const proj = options.projection!
        const includes = Object.values(proj).some((v) => v === 1)
        if (includes) {
          const projected: Record<string, unknown> = {}
          for (const [key] of Object.entries(proj)) {
            if (key in rest) projected[key] = rest[key]
          }
          return projected
        } else {
          for (const key of Object.keys(proj)) {
            delete (rest as Record<string, unknown>)[key]
          }
          return rest
        }
      })

      return mongoJson({ data: result, matchedCount: result.length })
    }

    case "countDocuments": {
      const docs = await loadParsedDocs(collectionId)
      const filtered = applyMongoFilter(docs, filter)
      return mongoJson({ count: filtered.length })
    }

    case "estimatedDocumentCount": {
      const count = await prisma.document.count({ where: { collectionId } })
      return mongoJson({ count })
    }

    case "insertOne": {
      if (!body.document)
        return mongoJson({ error: "document is required for insertOne" }, 400)

      const docs = await loadParsedDocs(collectionId)
      const doc = { ...(body.document as Record<string, unknown>) }

      if (doc._id === undefined && doc.id === undefined) {
        const generated = autoGenerateId(docs)
        if (generated) doc[generated.key] = generated.value
      }

      const idKey = doc._id !== undefined ? "_id" : doc.id !== undefined ? "id" : null
      if (idKey) {
        const exists = docs.some((item) =>
          String(item[idKey]) === String(doc[idKey])
        )
        if (exists) return mongoJson({ error: `Duplicate ${idKey} value` }, 409)
      }

      await prisma.document.create({
        data: { collectionId, data: JSON.stringify(doc) },
      })
      return mongoJson(
        { acknowledged: true, insertedId: (doc._id ?? doc.id ?? null) as string | number | null },
        201,
      )
    }

    case "insertMany": {
      if (!body.documents || !Array.isArray(body.documents))
        return mongoJson({ error: "documents array is required" }, 400)

      const existing = await loadParsedDocs(collectionId)
      const insertedIds: (string | number | null)[] = []
      const toInsert: Record<string, unknown>[] = []

      for (const rawDoc of body.documents) {
        const doc = { ...rawDoc }
        if (doc._id === undefined && doc.id === undefined) {
          const generated = autoGenerateId(existing)
          if (generated) doc[generated.key] = generated.value
        }

        const idKey = doc._id !== undefined ? "_id" : doc.id !== undefined ? "id" : null
        if (idKey) {
          const exists = existing.some((item) =>
            String(item[idKey]) === String(doc[idKey])
          )
          if (exists)
            return mongoJson({ error: `Duplicate ${idKey} value` }, 409)
        }

        existing.push(doc as ParsedDoc)
        toInsert.push(doc as Record<string, unknown>)
        insertedIds.push((doc._id ?? doc.id ?? null) as string | number | null)
      }

      await prisma.document.createMany({
        data: toInsert.map((doc) => ({
          collectionId,
          data: JSON.stringify(doc),
        })),
      })
      return mongoJson({ acknowledged: true, insertedIds }, 201)
    }

    case "updateOne": {
      if (!body.update)
        return mongoJson({ error: "update is required for updateOne" }, 400)

      const docs = await loadParsedDocs(collectionId)
      const matched = applyMongoFilter(docs, filter) as Record<string, unknown>[]
      const upsert = body.options?.upsert === true

      if (matched.length === 0) {
        if (!upsert)
          return mongoJson({ acknowledged: true, matchedCount: 0, modifiedCount: 0 })

        const newDoc: Record<string, unknown> = { _id: autoGenerateId(docs).value }
        for (const [k, v] of Object.entries(filter ?? {})) {
          if (!k.startsWith("$")) newDoc[k] = v
        }
        const updateBody = body.update as Record<string, unknown>
        if (updateBody.$set && typeof updateBody.$set === "object") {
          Object.assign(newDoc, updateBody.$set)
        }
        await prisma.document.create({
          data: { collectionId, data: JSON.stringify(newDoc) },
        })
        return mongoJson({
          acknowledged: true, matchedCount: 0, modifiedCount: 0,
          upsertedCount: 1, upsertedId: newDoc._id,
        })
      }

      const item = matched[0]
      const original = JSON.stringify(item)
      applyMongoUpdate(item, body.update)
      const modified = JSON.stringify(item) !== original
      await saveDoc(collectionId, item)
      return mongoJson({
        acknowledged: true, matchedCount: 1, modifiedCount: modified ? 1 : 0,
      })
    }

    case "updateMany": {
      if (!body.update)
        return mongoJson({ error: "update is required for updateMany" }, 400)

      const docs = await loadParsedDocs(collectionId)
      const matched = applyMongoFilter(docs, filter) as Record<string, unknown>[]
      let modifiedCount = 0

      for (const item of matched) {
        const original = JSON.stringify(item)
        applyMongoUpdate(item, body.update)
        if (JSON.stringify(item) !== original) modifiedCount++
        await saveDoc(collectionId, item)
      }

      return mongoJson({
        acknowledged: true, matchedCount: matched.length, modifiedCount,
      })
    }

    case "replaceOne": {
      if (!body.document)
        return mongoJson({ error: "document is required for replaceOne" }, 400)

      const docs = await loadParsedDocs(collectionId)
      const indices = collectMongoIndices(docs, filter)

      if (indices.length === 0)
        return mongoJson({ acknowledged: true, matchedCount: 0, modifiedCount: 0 })

      const idx = indices[0]
      const replacement = { ...(body.document as Record<string, unknown>) }
      const origItem = docs[idx]
      const origIdKey = origItem._id !== undefined ? "_id" : "id"
      const origId = origItem[origIdKey]
      if (origId !== undefined) {
        delete replacement._id
        delete replacement.id
        replacement[origIdKey] = origId
      }

      replacement.__prismaId = origItem.__prismaId
      await saveDoc(collectionId, replacement)
      return mongoJson({ acknowledged: true, matchedCount: 1, modifiedCount: 1 })
    }

    case "findOneAndUpdate": {
      if (!body.update)
        return mongoJson({ error: "update is required for findOneAndUpdate" }, 400)

      const docs = await loadParsedDocs(collectionId)
      const matched = applyMongoFilter(docs, filter) as Record<string, unknown>[]
      const upsert = body.options?.upsert === true
      const returnDoc = body.options?.returnDocument ?? "before"

      if (matched.length === 0) {
        if (!upsert) return mongoJson(null)

        const newDoc: Record<string, unknown> = { _id: autoGenerateId(docs).value }
        for (const [k, v] of Object.entries(filter ?? {})) {
          if (!k.startsWith("$")) newDoc[k] = v
        }
        const updateBody = body.update as Record<string, unknown>
        if (updateBody.$set && typeof updateBody.$set === "object") {
          Object.assign(newDoc, updateBody.$set)
        }
        await prisma.document.create({
          data: { collectionId, data: JSON.stringify(newDoc) },
        })
        return mongoJson({ _id: newDoc._id, ...newDoc })
      }

      const item = matched[0]
      const before = { ...item }
      const { __prismaId: _, ...beforeData } = before
      applyMongoUpdate(item, body.update)
      await saveDoc(collectionId, item)

      if (returnDoc === "after") {
        const { __prismaId: __, ...afterData } = item
        return mongoJson(afterData)
      }
      return mongoJson(beforeData)
    }

    case "findOneAndDelete": {
      const docs = await loadParsedDocs(collectionId)
      const matched = applyMongoFilter(docs, filter)
      if (matched.length === 0) return mongoJson(null)

      const target = matched[0] as Record<string, unknown>
      const { __prismaId: prismaId, ...docData } = target
      await deleteDoc(prismaId as string)
      return mongoJson(docData)
    }

    case "findOneAndReplace": {
      if (!body.document)
        return mongoJson({ error: "document is required for findOneAndReplace" }, 400)

      const docs = await loadParsedDocs(collectionId)
      const matched = applyMongoFilter(docs, filter) as Record<string, unknown>[]
      const upsert = body.options?.upsert === true
      const returnDoc = body.options?.returnDocument ?? "before"

      if (matched.length === 0) {
        if (!upsert) return mongoJson(null)

        const newDoc = { _id: autoGenerateId(docs).value, ...(body.document as Record<string, unknown>) }
        await prisma.document.create({
          data: { collectionId, data: JSON.stringify(newDoc) },
        })
        return mongoJson(newDoc)
      }

      const idx = docs.indexOf(matched[0])
      const before = { ...docs[idx] }
      const { __prismaId: _, ...beforeData } = before

      const replacement = { ...(body.document as Record<string, unknown>) }
      const origId = before._id ?? before.id
      if (origId !== undefined) {
        delete replacement._id
        delete replacement.id
        replacement[before._id !== undefined ? "_id" : "id"] = origId
      }

      replacement.__prismaId = before.__prismaId
      await saveDoc(collectionId, replacement)

      if (returnDoc === "after") {
        const { __prismaId: __, ...afterData } = replacement
        return mongoJson(afterData)
      }
      return mongoJson(beforeData)
    }

    case "distinct": {
      if (!body.key) return mongoJson({ error: "key is required for distinct" }, 400)
      const docs = await loadParsedDocs(collectionId)
      const filtered = applyMongoFilter(docs, filter) as Record<string, unknown>[]
      const values = new Set<unknown>()
      for (const item of filtered) {
        const val = item[body.key]
        if (val !== undefined) values.add(val)
      }
      return mongoJson({ values: Array.from(values) })
    }

    case "bulkWrite": {
      if (!body.operations || !Array.isArray(body.operations))
        return mongoJson({ error: "operations array is required for bulkWrite" }, 400)

      let docs = await loadParsedDocs(collectionId)
      const result: {
        ok: number; nInserted: number; nMatched: number; nModified: number
        nUpserted: number; nRemoved: number
        upserted: { index: number; _id: string }[]
        writeErrors: { index: number; errmsg: string }[]
      } = {
        ok: 1, nInserted: 0, nMatched: 0, nModified: 0, nUpserted: 0, nRemoved: 0,
        upserted: [], writeErrors: [],
      }

      for (let i = 0; i < body.operations.length; i++) {
        const op = body.operations[i]
        try {
          if (op.operation === "insertOne" && op.document) {
            const doc = { ...op.document }
            if (doc._id === undefined && doc.id === undefined) {
              const g = autoGenerateId(docs)
              if (g) doc[g.key] = g.value
            }
            docs.push(doc as Record<string, unknown>)
            result.nInserted++
            result.upserted.push({ index: i, _id: String(doc._id ?? doc.id ?? "") })
          } else if ((op.operation === "updateOne" || op.operation === "updateMany") && op.update) {
            const matched = applyMongoFilter(docs, op.filter ?? {}) as Record<string, unknown>[]
            if (matched.length > 0) {
              result.nMatched += matched.length
              for (const item of matched) {
                const orig = JSON.stringify(item)
                applyMongoUpdate(item, op.update)
                if (JSON.stringify(item) !== orig) result.nModified++
              }
            }
          } else if ((op.operation === "deleteOne" || op.operation === "deleteMany") && op.filter) {
            const matched = applyMongoFilter(docs, op.filter) as Record<string, unknown>[]
            const matchSet = new Set(matched)
            docs = docs.filter((d) => {
              if (matchSet.has(d)) { result.nRemoved++; return false }
              return true
            })
          } else if (op.operation === "replaceOne" && op.document && op.filter) {
            const indices = collectMongoIndices(docs, op.filter)
            if (indices.length > 0) {
              const idx = indices[0]
              const replacement = { ...(op.document as Record<string, unknown>) }
              const origItem = docs[idx]
              const origIdKey = origItem._id !== undefined ? "_id" : "id"
              const origId = origItem[origIdKey]
              if (origId !== undefined) {
                delete replacement._id
                delete replacement.id
                replacement[origIdKey] = origId
              }
              replacement.__prismaId = origItem.__prismaId
              docs[idx] = replacement
              result.nMatched++
              result.nModified++
            }
          }
        } catch (e) {
          result.writeErrors.push({ index: i, errmsg: String(e) })
        }
      }

      // Persist all changes
      const inserts = docs.filter((d) => !d.__prismaId)
      const updates = docs.filter((d) => d.__prismaId)

      if (inserts.length > 0) {
        await prisma.document.createMany({
          data: inserts.map((doc) => {
            const { __prismaId: _, ...data } = doc
            return { collectionId, data: JSON.stringify(data) }
          }),
        })
      }
      for (const doc of updates) {
        await saveDoc(collectionId, doc)
      }
      // Delete removed docs
      const currentIds = new Set(updates.map((d) => d.__prismaId as string))
      const allRecords = await prisma.document.findMany({
        where: { collectionId },
        select: { id: true },
      })
      const toDelete = allRecords.filter((r) => !currentIds.has(r.id)).map((r) => r.id)
      if (toDelete.length > 0) {
        await prisma.document.deleteMany({ where: { id: { in: toDelete } } })
      }

      return mongoJson(result)
    }
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

function collectMongoIndices(
  data: Record<string, unknown>[],
  filter: Record<string, unknown>,
): number[] {
  const filtered = applyMongoFilter(data, filter)
  const indices: number[] = []
  for (const item of filtered as Record<string, unknown>[]) {
    const idx = data.indexOf(item)
    if (idx !== -1) indices.push(idx)
  }
  return indices
}

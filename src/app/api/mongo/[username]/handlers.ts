import { prisma } from "@/lib/prisma"
import { applyMongoFilter } from "@/lib/api/mongo-filter"
import { applyMongoUpdate } from "@/lib/api/mongo-update"
import { autoGenerateId } from "@/lib/api/query"
import type { MongoBody, ParsedDoc } from "./types"
import { mongoJson, loadParsedDocs, saveDoc, deleteDoc, collectMongoIndices } from "./utils"

export async function handleFind(collectionId: string, body: MongoBody) {
  let docs = await loadParsedDocs(collectionId)
  let result = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
  const options = body.options ?? {}

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

export async function handleCountDocuments(collectionId: string, body: MongoBody) {
  const docs = await loadParsedDocs(collectionId)
  const filtered = applyMongoFilter(docs, body.filter ?? {})
  return mongoJson({ count: filtered.length })
}

export async function handleEstimatedDocumentCount(collectionId: string) {
  const count = await prisma.document.count({ where: { collectionId } })
  return mongoJson({ count })
}

export async function handleInsertOne(collectionId: string, body: MongoBody) {
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

export async function handleInsertMany(collectionId: string, body: MongoBody) {
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

export async function handleUpdateOne(collectionId: string, body: MongoBody) {
  if (!body.update)
    return mongoJson({ error: "update is required for updateOne" }, 400)

  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
  const upsert = body.options?.upsert === true

  if (matched.length === 0) {
    if (!upsert)
      return mongoJson({ acknowledged: true, matchedCount: 0, modifiedCount: 0 })

    const newDoc: Record<string, unknown> = { _id: autoGenerateId(docs).value }
    for (const [k, v] of Object.entries(body.filter ?? {})) {
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

export async function handleUpdateMany(collectionId: string, body: MongoBody) {
  if (!body.update)
    return mongoJson({ error: "update is required for updateMany" }, 400)

  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
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

export async function handleDeleteOne(collectionId: string, body: MongoBody) {
  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
  let deletedCount = 0

  if (matched.length > 0) {
    const prismaId = matched[0].__prismaId as string
    await deleteDoc(prismaId)
    deletedCount = 1
  }

  return mongoJson({ acknowledged: true, deletedCount })
}

export async function handleDeleteMany(collectionId: string, body: MongoBody) {
  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
  let deletedCount = 0

  for (const item of matched) {
    const prismaId = item.__prismaId as string
    await deleteDoc(prismaId)
    deletedCount++
  }

  return mongoJson({ acknowledged: true, deletedCount })
}

export async function handleReplaceOne(collectionId: string, body: MongoBody) {
  if (!body.document)
    return mongoJson({ error: "document is required for replaceOne" }, 400)

  const docs = await loadParsedDocs(collectionId)
  const indices = collectMongoIndices(docs, body.filter ?? {})

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

export async function handleFindOneAndUpdate(collectionId: string, body: MongoBody) {
  if (!body.update)
    return mongoJson({ error: "update is required for findOneAndUpdate" }, 400)

  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
  const upsert = body.options?.upsert === true
  const returnDoc = body.options?.returnDocument ?? "before"

  if (matched.length === 0) {
    if (!upsert) return mongoJson(null)

    const newDoc: Record<string, unknown> = { _id: autoGenerateId(docs).value }
    for (const [k, v] of Object.entries(body.filter ?? {})) {
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

export async function handleFindOneAndDelete(collectionId: string, body: MongoBody) {
  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {})
  if (matched.length === 0) return mongoJson(null)

  const target = matched[0] as Record<string, unknown>
  const { __prismaId: prismaId, ...docData } = target
  await deleteDoc(prismaId as string)
  return mongoJson(docData)
}

export async function handleFindOneAndReplace(collectionId: string, body: MongoBody) {
  if (!body.document)
    return mongoJson({ error: "document is required for findOneAndReplace" }, 400)

  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
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

export async function handleDistinct(collectionId: string, body: MongoBody) {
  if (!body.key) return mongoJson({ error: "key is required for distinct" }, 400)
  const docs = await loadParsedDocs(collectionId)
  const filtered = applyMongoFilter(docs, body.filter ?? {}) as Record<string, unknown>[]
  const values = new Set<unknown>()
  for (const item of filtered) {
    const val = item[body.key]
    if (val !== undefined) values.add(val)
  }
  return mongoJson({ values: Array.from(values) })
}

export async function handleBulkWrite(collectionId: string, body: MongoBody) {
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

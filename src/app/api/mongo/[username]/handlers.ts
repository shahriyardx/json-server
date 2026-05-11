import { prisma } from "@/lib/prisma"
import { applyMongoFilter } from "@/lib/api/mongo-filter"
import { applyMongoUpdate } from "@/lib/api/mongo-update"
import { evaluateExpression } from "@/lib/api/mongo-expr"
import { autoGenerateId } from "@/lib/api/query"
import type { MongoBody, ParsedDoc } from "./types"
import {
  mongoJson,
  loadParsedDocs,
  saveDoc,
  deleteDoc,
  collectMongoIndices,
} from "./utils"

export async function handleFind(collectionId: string, body: MongoBody) {
  const docs = await loadParsedDocs(collectionId)
  let result = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  const options = body.options ?? {}

  if (options.sort) {
    const sortEntries = Object.entries(options.sort) as [string, 1 | -1][]
    if (sortEntries.length > 0) {
      result = [...result].sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const aVal = a[field] as string | number
          const bVal = b[field] as string | number
          if (aVal < bVal) return -dir
          if (aVal > bVal) return dir
        }
        return 0
      })
    }
  }

  if (options.skip !== undefined) result = result.slice(options.skip)
  if (options.limit !== undefined) result = result.slice(0, options.limit)

  result = result.map((item) => {
    const { __prismaId, ...rest } = item
    if (!options.projection) return rest

    const proj = options.projection as Record<string, 0 | 1>
    const includes = Object.values(proj).some((v) => v === 1)
    if (includes) {
      const projected: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(proj)) {
        if (val === 1 && key in rest) projected[key] = rest[key]
      }
      if (proj._id !== 0 && "_id" in rest) projected._id = rest._id
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

export async function handleCountDocuments(
  collectionId: string,
  body: MongoBody,
) {
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
  delete doc.__prismaId

  if (doc._id === undefined && doc.id === undefined) {
    const generated = autoGenerateId(docs)
    if (generated) doc[generated.key] = generated.value
  }

  const idKey =
    doc._id !== undefined ? "_id" : doc.id !== undefined ? "id" : null
  if (idKey) {
    const exists = docs.some(
      (item) => String(item[idKey]) === String(doc[idKey]),
    )
    if (exists) return mongoJson({ error: `Duplicate ${idKey} value` }, 409)
  }

  await prisma.document.create({
    data: { collectionId, data: JSON.stringify(doc) },
  })
  return mongoJson(
    {
      acknowledged: true,
      insertedId: (doc._id ?? doc.id ?? null) as string | number | null,
    },
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
    delete doc.__prismaId
    if (doc._id === undefined && doc.id === undefined) {
      const generated = autoGenerateId(existing)
      if (generated) doc[generated.key] = generated.value
    }

    const idKey =
      doc._id !== undefined ? "_id" : doc.id !== undefined ? "id" : null
    if (idKey) {
      const exists = existing.some(
        (item) => String(item[idKey]) === String(doc[idKey]),
      )
      if (exists) return mongoJson({ error: `Duplicate ${idKey} value` }, 409)
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
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  const upsert = body.options?.upsert === true

  if (matched.length === 0) {
    if (!upsert)
      return mongoJson({
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
      })

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
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 1,
      upsertedId: newDoc._id,
    })
  }

  const item = matched[0]
  const original = JSON.stringify(item)
  applyMongoUpdate(item, body.update)
  const modified = JSON.stringify(item) !== original
  await saveDoc(collectionId, item)
  return mongoJson({
    acknowledged: true,
    matchedCount: 1,
    modifiedCount: modified ? 1 : 0,
  })
}

export async function handleUpdateMany(collectionId: string, body: MongoBody) {
  if (!body.update)
    return mongoJson({ error: "update is required for updateMany" }, 400)

  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  let modifiedCount = 0

  for (const item of matched) {
    const original = JSON.stringify(item)
    applyMongoUpdate(item, body.update)
    if (JSON.stringify(item) !== original) modifiedCount++
    await saveDoc(collectionId, item)
  }

  return mongoJson({
    acknowledged: true,
    matchedCount: matched.length,
    modifiedCount,
  })
}

export async function handleDeleteOne(collectionId: string, body: MongoBody) {
  const docs = await loadParsedDocs(collectionId)
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
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
  const matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
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

export async function handleFindOneAndUpdate(
  collectionId: string,
  body: MongoBody,
) {
  if (!body.update)
    return mongoJson({ error: "update is required for findOneAndUpdate" }, 400)

  const docs = await loadParsedDocs(collectionId)
  let matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  const options = body.options ?? {}
  const upsert = options.upsert === true
  const returnDoc = options.returnDocument ?? "before"

  // Apply sort to pick which doc to modify
  if (matched.length > 0 && options.sort) {
    const sortEntries = Object.entries(options.sort) as [string, 1 | -1][]
    if (sortEntries.length > 0) {
      matched = [...matched].sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const aVal = a[field] as string | number
          const bVal = b[field] as string | number
          if (aVal < bVal) return -dir
          if (aVal > bVal) return dir
        }
        return 0
      })
    }
  }

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
    return mongoJson(applyProjection({ _id: newDoc._id, ...newDoc }, options.projection))
  }

  const item = matched[0]
  const before = { ...item }
  const { __prismaId: _, ...beforeData } = before
  applyMongoUpdate(item, body.update)
  await saveDoc(collectionId, item)

  if (returnDoc === "after") {
    const { __prismaId: __, ...afterData } = item
    return mongoJson(applyProjection(afterData, options.projection))
  }
  return mongoJson(applyProjection(beforeData, options.projection))
}

export async function handleFindOneAndDelete(
  collectionId: string,
  body: MongoBody,
) {
  const docs = await loadParsedDocs(collectionId)
  let matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  const options = body.options ?? {}

  if (matched.length > 0 && options.sort) {
    const sortEntries = Object.entries(options.sort) as [string, 1 | -1][]
    if (sortEntries.length > 0) {
      matched = [...matched].sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const aVal = a[field] as string | number
          const bVal = b[field] as string | number
          if (aVal < bVal) return -dir
          if (aVal > bVal) return dir
        }
        return 0
      })
    }
  }

  if (matched.length === 0) return mongoJson(null)

  const target = matched[0] as Record<string, unknown>
  const { __prismaId: prismaId, ...docData } = target
  await deleteDoc(prismaId as string)
  return mongoJson(applyProjection(docData, options.projection))
}

export async function handleFindOneAndReplace(
  collectionId: string,
  body: MongoBody,
) {
  if (!body.document)
    return mongoJson(
      { error: "document is required for findOneAndReplace" },
      400,
    )

  const docs = await loadParsedDocs(collectionId)
  let matched = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  const options = body.options ?? {}
  const upsert = options.upsert === true
  const returnDoc = options.returnDocument ?? "before"

  // Apply sort to pick which doc to replace
  if (matched.length > 0 && options.sort) {
    const sortEntries = Object.entries(options.sort) as [string, 1 | -1][]
    if (sortEntries.length > 0) {
      matched = [...matched].sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const aVal = a[field] as string | number
          const bVal = b[field] as string | number
          if (aVal < bVal) return -dir
          if (aVal > bVal) return dir
        }
        return 0
      })
    }
  }

  if (matched.length === 0) {
    if (!upsert) return mongoJson(null)

    const newDoc = {
      _id: autoGenerateId(docs).value,
      ...(body.document as Record<string, unknown>),
    }
    await prisma.document.create({
      data: { collectionId, data: JSON.stringify(newDoc) },
    })
    return mongoJson(applyProjection(newDoc, options.projection))
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
    return mongoJson(applyProjection(afterData, options.projection))
  }
  return mongoJson(applyProjection(beforeData, options.projection))
}

export async function handleDistinct(collectionId: string, body: MongoBody) {
  if (!body.key)
    return mongoJson({ error: "key is required for distinct" }, 400)
  const docs = await loadParsedDocs(collectionId)
  const filtered = applyMongoFilter(docs, body.filter ?? {}) as Record<
    string,
    unknown
  >[]
  const values = new Set<unknown>()
  for (const item of filtered) {
    const val = item[body.key]
    if (val !== undefined) values.add(val)
  }
  return mongoJson({ values: Array.from(values) })
}

function applyProjection(
  doc: Record<string, unknown>,
  projection?: unknown,
): Record<string, unknown> {
  if (!projection) return doc
  const proj = projection as Record<string, 0 | 1>
  const includes = Object.values(proj).some((v) => v === 1)
  if (includes) {
    const projected: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(proj)) {
      if (val === 1 && key in doc) projected[key] = doc[key]
    }
    if (proj._id !== 0 && "_id" in doc) projected._id = doc._id
    return projected
  } else {
    const result = { ...doc }
    for (const key of Object.keys(proj)) {
      delete result[key]
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// Aggregation pipeline
// ---------------------------------------------------------------------------

function processStage(
  docs: Record<string, unknown>[],
  stage: Record<string, unknown>,
  vars?: Record<string, unknown>,
): Record<string, unknown>[] {
  const stageKey = Object.keys(stage)[0]
  const stageVal = stage[stageKey]

  switch (stageKey) {
    case "$match":
      return applyMongoFilter(docs, (stageVal ?? {}) as Record<string, unknown>, vars) as Record<
        string,
        unknown
      >[]

    case "$project": {
      const spec = stageVal as Record<string, unknown>
      const includes = Object.values(spec).some(
        (v) => v === 1 || (typeof v === "object" && v !== null),
      )
      return docs.map((doc) => {
        if (includes) {
          const projected: Record<string, unknown> = {}
          for (const [key, val] of Object.entries(spec)) {
            if (typeof val === "string" && val.startsWith("$")) {
              projected[key] = evaluateExpression(doc, val, vars)
            } else if (typeof val === "object" && val !== null) {
              projected[key] = evaluateExpression(doc, val, vars)
            } else if (val === 1) {
              if (key in doc) projected[key] = doc[key]
            }
          }
          // _id included by default unless explicitly excluded
          if (spec._id !== 0 && "_id" in doc) {
            projected._id = doc._id
          }
          return projected
        }
        const excluded = new Set(
          Object.entries(spec)
            .filter(([, v]) => v === 0)
            .map(([k]) => k),
        )
        const projected: Record<string, unknown> = {}
        for (const key of Object.keys(doc)) {
          if (!excluded.has(key)) projected[key] = doc[key]
        }
        return projected
      })
    }

    case "$sort": {
      const sortSpec = stageVal as Record<string, 1 | -1>
      const entries = Object.entries(sortSpec)
      if (entries.length === 0) return docs
      return [...docs].sort((a, b) => {
        for (const [field, dir] of entries) {
          const aVal = a[field] as string | number
          const bVal = b[field] as string | number
          if (aVal < bVal) return -(dir as number)
          if (aVal > bVal) return dir as number
        }
        return 0
      })
    }

    case "$skip":
      return docs.slice(Math.max(0, stageVal as number))

    case "$limit":
      return docs.slice(0, Math.max(0, stageVal as number))

    case "$count": {
      const countField = String(stageVal ?? "count")
      return [{ [countField]: docs.length }]
    }

    case "$group": {
      const groupSpec = stageVal as Record<string, unknown>
      const idExpr = groupSpec._id
      const groups = new Map<string, Record<string, unknown>>()

      for (const doc of docs) {
        let groupKey: string
        if (idExpr === null || idExpr === undefined) {
          groupKey = "__null"
        } else if (
          typeof idExpr === "object" &&
          !Array.isArray(idExpr) &&
          idExpr !== null
        ) {
          const keyDoc: Record<string, string> = {}
          for (const [k, v] of Object.entries(
            idExpr as Record<string, unknown>,
          )) {
            const resolved = evaluateExpression(doc, v, vars)
            keyDoc[k] = JSON.stringify(resolved)
          }
          groupKey = JSON.stringify(keyDoc)
        } else {
          const resolved = evaluateExpression(doc, idExpr, vars)
          groupKey = JSON.stringify(resolved)
        }

        if (!groups.has(groupKey)) {
          const base: Record<string, unknown> = { _id: evaluateExpression(doc, idExpr ?? "$__none", vars) }
          // Initialize accumulators
          for (const [key, val] of Object.entries(groupSpec)) {
            if (key === "_id") continue
            if (typeof val === "object" && val !== null) {
              const accExpr = val as Record<string, unknown>
              const accOp = Object.keys(accExpr)[0]
              if (accOp === "$push" || accOp === "$addToSet") {
                base[key] = []
              } else if (accOp === "$first") {
                base[key] = evaluateExpression(doc, accExpr[accOp], vars)
              } else if (accOp === "$last") {
                base[key] = evaluateExpression(doc, accExpr[accOp], vars)
              } else if (accOp === "$min" || accOp === "$max") {
                base[key] = undefined
              } else if (accOp === "$avg") {
                base[key] = { sum: 0, count: 0 }
              } else {
                base[key] = 0
              }
            }
          }
          groups.set(groupKey, base)
        }

        const group = groups.get(groupKey)!

        for (const [key, val] of Object.entries(groupSpec)) {
          if (key === "_id") continue
          if (typeof val === "object" && val !== null) {
            const accExpr = val as Record<string, unknown>
            const accOp = Object.keys(accExpr)[0]
            const accField = accExpr[accOp]
            const resolved = evaluateExpression(doc, accField, vars)

            switch (accOp) {
              case "$sum":
                group[key] = (group[key] as number) + (typeof resolved === "number" ? resolved : 1)
                break
              case "$avg": {
                const current = group[key] as { sum: number; count: number } | number
                if (typeof current === "number") {
                  const sum = current + (typeof resolved === "number" ? (resolved as number) : 0)
                  groups.set(groupKey, { ...group, [key]: { sum, count: 2 } })
                } else {
                  current.sum += typeof resolved === "number" ? (resolved as number) : 0
                  current.count++
                }
                break
              }
              case "$min":
                if (
                  resolved !== undefined &&
                  (group[key] === undefined ||
                    (typeof resolved === "number" &&
                      typeof group[key] === "number" &&
                      (resolved as number) < (group[key] as number)))
                ) {
                  group[key] = resolved
                }
                break
              case "$max":
                if (
                  resolved !== undefined &&
                  (group[key] === undefined ||
                    (typeof resolved === "number" &&
                      typeof group[key] === "number" &&
                      (resolved as number) > (group[key] as number)))
                ) {
                  group[key] = resolved
                }
                break
              case "$push":
                if (resolved !== undefined)
                  (group[key] as unknown[]).push(resolved)
                break
              case "$addToSet":
                if (resolved !== undefined) {
                  const set = group[key] as unknown[]
                  if (!set.includes(resolved)) set.push(resolved)
                }
                break
              case "$first":
                // Already set on first encounter
                break
              case "$last":
                group[key] = resolved
                break
            }
          } else {
            group[key] = evaluateExpression(doc, val, vars)
          }
        }
      }

      const result = Array.from(groups.values())
      // Resolve $avg accumulators from {sum, count} to number
      for (const group of result) {
        for (const [key, val] of Object.entries(groupSpec)) {
          if (key === "_id") continue
          if (typeof val === "object" && val !== null) {
            const accExpr = val as Record<string, unknown>
            const accOp = Object.keys(accExpr)[0]
            if (accOp === "$avg") {
              const avgVal = group[key]
              if (typeof avgVal === "object" && avgVal !== null) {
                const { sum, count } = avgVal as { sum: number; count: number }
                group[key] = count > 0 ? sum / count : 0
              }
            }
          }
        }
      }
      return result
    }

    case "$unwind": {
      const path =
        typeof stageVal === "string"
          ? stageVal
          : (stageVal as Record<string, unknown>).path
      if (typeof path !== "string") return docs
      const fieldName = path.startsWith("$") ? path.slice(1) : path
      const result: Record<string, unknown>[] = []
      for (const doc of docs) {
        const arr = doc[fieldName]
        if (Array.isArray(arr)) {
          for (const element of arr) {
            result.push({ ...doc, [fieldName]: element })
          }
        } else {
          result.push(doc)
        }
      }
      return result
    }

    case "$addFields":
    case "$set": {
      const additions = stageVal as Record<string, unknown>
      return docs.map((doc) => {
        const updated = { ...doc }
        for (const [key, val] of Object.entries(additions)) {
          updated[key] = evaluateExpression(doc, val, vars)
        }
        return updated
      })
    }

    case "$replaceRoot": {
      const newRootExpr = (stageVal as Record<string, unknown>).newRoot
      if (newRootExpr === undefined) return docs
      return docs.map((doc) => {
        const resolved = evaluateExpression(doc, newRootExpr, vars)
        if (typeof resolved !== "object" || resolved === null) return doc
        return { ...(resolved as Record<string, unknown>) }
      })
    }

    case "$replaceWith":
      return docs.map((doc) => {
        const resolved = evaluateExpression(doc, stageVal, vars)
        if (typeof resolved !== "object" || resolved === null) return doc
        return { ...(resolved as Record<string, unknown>) }
      })

    case "$sortByCount": {
      const expr = stageVal as string
      const groups = new Map<string, number>()
      for (const doc of docs) {
        const val = evaluateExpression(doc, expr, vars)
        const key = JSON.stringify(val)
        groups.set(key, (groups.get(key) ?? 0) + 1)
      }
      return Array.from(groups.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ _id: JSON.parse(key), count }))
    }

    case "$sample": {
      const size = Math.min(
        (stageVal as Record<string, number>).size ?? 1,
        docs.length,
      )
      const shuffled = [...docs]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled.slice(0, size)
    }

    default:
      throw new Error(`Unknown aggregation stage: ${stageKey}`)
  }
}

async function handleLookup(
  docs: Record<string, unknown>[],
  stage: Record<string, unknown>,
  collectionId: string,
): Promise<Record<string, unknown>[]> {
  const spec = stage.$lookup as Record<string, unknown> | undefined
  if (!spec) return docs
  const from = String(spec.from ?? "")
  const as = String(spec.as ?? "")

  if (!from || !as) return docs

  // Find the target collection in the same database
  const currentCol = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { databaseId: true },
  })
  if (!currentCol) return docs

  const targetCol = await prisma.collection.findFirst({
    where: { databaseId: currentCol.databaseId, name: from },
    select: { id: true },
  })
  if (!targetCol) return docs

  const rawForeignDocs = await loadParsedDocs(targetCol.id)
  const foreignDocs: Record<string, unknown>[] = rawForeignDocs.map((fdoc) => {
    const { __prismaId: _, ...rest } = fdoc
    return rest as Record<string, unknown>
  })

  // Pipeline + let syntax
  if (spec.pipeline && Array.isArray(spec.pipeline)) {
    const pipeline = spec.pipeline as Record<string, unknown>[]
    const letSpec = spec.let as Record<string, unknown> | undefined

    return docs.map((doc) => {
      // Resolve let variables from source doc
      const vars: Record<string, unknown> = {}
      if (letSpec) {
        for (const [key, expr] of Object.entries(letSpec)) {
          vars[key] = evaluateExpression(doc, expr)
        }
      }

      // Run pipeline against foreign docs with vars context
      let result = [...foreignDocs]
      for (const stage of pipeline) {
        result = processStage(result, stage, vars)
      }
      return { ...doc, [as]: result }
    })
  }

  // Simple localField/foreignField syntax
  const localField = String(spec.localField ?? "")
  const foreignField = String(spec.foreignField ?? "")
  if (!localField || !foreignField) return docs

  const foreignMap = new Map<string, Record<string, unknown>[]>()
  for (const fdoc of foreignDocs) {
    const fval = fdoc[foreignField]
    const key = JSON.stringify(fval)
    if (!foreignMap.has(key)) foreignMap.set(key, [])
    foreignMap.get(key)!.push(fdoc)
  }

  return docs.map((doc) => {
    const lval = doc[localField]
    const key = JSON.stringify(lval)
    return { ...doc, [as]: foreignMap.get(key) ?? [] }
  })
}

export async function handleAggregate(collectionId: string, body: MongoBody) {
  const pipeline = body.pipeline
  if (!pipeline || !Array.isArray(pipeline) || pipeline.length === 0) {
    // Empty pipeline → return all docs (same as find with no filter)
    return handleFind(collectionId, { ...body, filter: {} })
  }

  const rawDocs = await loadParsedDocs(collectionId)
  let docs = rawDocs.map((doc) => {
    const { __prismaId: _, ...rest } = doc
    return rest as Record<string, unknown>
  })

  for (const stage of pipeline) {
    const stageKey = Object.keys(stage)[0]
    try {
      docs = stageKey === "$lookup"
        ? await handleLookup(docs, stage, collectionId)
        : processStage(docs, stage)
    } catch (e) {
      return mongoJson({ error: String(e) }, 400)
    }
  }

  return mongoJson({ data: docs })
}

export async function handleBulkWrite(collectionId: string, body: MongoBody) {
  if (!body.operations || !Array.isArray(body.operations))
    return mongoJson(
      { error: "operations array is required for bulkWrite" },
      400,
    )

  let docs = await loadParsedDocs(collectionId)
  const result: {
    ok: number
    nInserted: number
    nMatched: number
    nModified: number
    nUpserted: number
    nRemoved: number
    upserted: { index: number; _id: string }[]
    writeErrors: { index: number; errmsg: string }[]
  } = {
    ok: 1,
    nInserted: 0,
    nMatched: 0,
    nModified: 0,
    nUpserted: 0,
    nRemoved: 0,
    upserted: [],
    writeErrors: [],
  }

  for (let i = 0; i < body.operations.length; i++) {
    const op = body.operations[i]
    try {
      if (op.operation === "insertOne" && op.document) {
        const doc = { ...op.document }
        delete doc.__prismaId
        if (doc._id === undefined && doc.id === undefined) {
          const g = autoGenerateId(docs)
          if (g) doc[g.key] = g.value
        }
        docs.push(doc as Record<string, unknown>)
        result.nInserted++
      } else if (
        (op.operation === "updateOne" || op.operation === "updateMany") &&
        op.update
      ) {
        const matched = applyMongoFilter(docs, op.filter ?? {}) as Record<
          string,
          unknown
        >[]
        if (matched.length > 0) {
          result.nMatched += matched.length
          for (const item of matched) {
            const orig = JSON.stringify(item)
            applyMongoUpdate(item, op.update)
            if (JSON.stringify(item) !== orig) result.nModified++
          }
        } else if (op.upsert) {
          const newDoc: Record<string, unknown> = {
            _id: autoGenerateId(docs).value,
          }
          for (const [k, v] of Object.entries(op.filter ?? {})) {
            if (!k.startsWith("$")) newDoc[k] = v
          }
          const updateBody = op.update as Record<string, unknown>
          if (updateBody.$set && typeof updateBody.$set === "object") {
            Object.assign(newDoc, updateBody.$set)
          }
          docs.push(newDoc)
          result.nUpserted++
          result.upserted.push({ index: i, _id: String(newDoc._id) })
        }
      } else if (op.operation === "deleteOne" && op.filter) {
        const matched = applyMongoFilter(docs, op.filter) as Record<
          string,
          unknown
        >[]
        const idx = docs.indexOf(matched[0])
        if (idx !== -1) {
          docs.splice(idx, 1)
          result.nRemoved++
        }
      } else if (op.operation === "deleteMany" && op.filter) {
        const matched = applyMongoFilter(docs, op.filter) as Record<
          string,
          unknown
        >[]
        const matchSet = new Set(matched)
        docs = docs.filter((d) => {
          if (matchSet.has(d)) {
            result.nRemoved++
            return false
          }
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
        } else if (op.upsert) {
          const newDoc = {
            _id: autoGenerateId(docs).value,
            ...(op.document as Record<string, unknown>),
          }
          docs.push(newDoc)
          result.nUpserted++
          result.upserted.push({ index: i, _id: String(newDoc._id) })
        }
      }
    } catch (e) {
      result.writeErrors.push({ index: i, errmsg: String(e) })
    }
  }

  // Persist all changes
  const inserts = docs.filter((d) => !d.__prismaId)
  const updates = docs.filter((d) => d.__prismaId)

  for (const doc of inserts) {
    const { __prismaId: _, ...data } = doc
    const created = await prisma.document.create({
      data: { collectionId, data: JSON.stringify(data) },
      select: { id: true },
    })
    doc.__prismaId = created.id
  }
  for (const doc of updates) {
    await saveDoc(collectionId, doc)
  }

  // Delete removed docs — in-memory state is authoritative
  const liveIds = new Set(docs.map((d) => d.__prismaId as string).filter(Boolean))
  const allRecords = await prisma.document.findMany({
    where: { collectionId },
    select: { id: true },
  })
  const toDelete = allRecords
    .filter((r) => !liveIds.has(r.id))
    .map((r) => r.id)
  if (toDelete.length > 0) {
    await prisma.document.deleteMany({ where: { id: { in: toDelete } } })
  }

  return mongoJson(result)
}

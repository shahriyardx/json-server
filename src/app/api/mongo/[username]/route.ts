import { prisma } from "@/lib/prisma"
import {
  rateLimiter,
  checkAndIncrementRequest,
  isAdminRole,
} from "@/lib/api/usage"
import { verifyPassword, parseBasicAuth } from "@/lib/api/db-auth"
import { ALLOWED_OPS, type MongoBody } from "./types"
import { mongoJson, ensureCollection } from "./utils"
import {
  handleFind,
  handleCountDocuments,
  handleEstimatedDocumentCount,
  handleInsertOne,
  handleInsertMany,
  handleUpdateOne,
  handleUpdateMany,
  handleDeleteOne,
  handleDeleteMany,
  handleReplaceOne,
  handleFindOneAndUpdate,
  handleFindOneAndDelete,
  handleFindOneAndReplace,
  handleDistinct,
  handleBulkWrite,
} from "./handlers"

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

  // Ping — lightweight connectivity check
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

  switch (body.operation) {
    case "find": return handleFind(collectionId, body)
    case "countDocuments": return handleCountDocuments(collectionId, body)
    case "estimatedDocumentCount": return handleEstimatedDocumentCount(collectionId)
    case "insertOne": return handleInsertOne(collectionId, body)
    case "insertMany": return handleInsertMany(collectionId, body)
    case "updateOne": return handleUpdateOne(collectionId, body)
    case "updateMany": return handleUpdateMany(collectionId, body)
    case "deleteOne": return handleDeleteOne(collectionId, body)
    case "deleteMany": return handleDeleteMany(collectionId, body)
    case "replaceOne": return handleReplaceOne(collectionId, body)
    case "findOneAndUpdate": return handleFindOneAndUpdate(collectionId, body)
    case "findOneAndDelete": return handleFindOneAndDelete(collectionId, body)
    case "findOneAndReplace": return handleFindOneAndReplace(collectionId, body)
    case "distinct": return handleDistinct(collectionId, body)
    case "bulkWrite": return handleBulkWrite(collectionId, body)
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

export type SortDirection = 1 | -1

export interface FindOptions {
  sort?: Record<string, SortDirection>
  limit?: number
  skip?: number
  projection?: Record<string, 0 | 1>
}

export interface Filter {
  [key: string]: unknown
}

export interface Document {
  [key: string]: unknown
}

export interface Update {
  $set?: Record<string, unknown>
  $unset?: Record<string, unknown>
  $inc?: Record<string, number>
  $mul?: Record<string, number>
  $min?: Record<string, number>
  $max?: Record<string, number>
  $rename?: Record<string, string>
  $currentDate?: Record<string, unknown>
  $push?: Record<string, unknown>
  $addToSet?: Record<string, unknown>
  $pull?: Record<string, unknown>
  [key: string]: unknown
}

export interface InsertResult {
  acknowledged: boolean
  insertedId: string | number | null
}

export interface InsertManyResult {
  acknowledged: boolean
  insertedIds: (string | number | null)[]
}

export interface UpdateResult {
  acknowledged: boolean
  matchedCount: number
  modifiedCount: number
  upsertedCount?: number
  upsertedId?: string | null
}

export interface DeleteResult {
  acknowledged: boolean
  deletedCount: number
}

export interface CountResult {
  count: number
}

export interface FindResult {
  data: Document[]
  matchedCount: number
}

export interface DistinctResult {
  values: unknown[]
}

export interface BulkWriteResult {
  ok: number
  nInserted: number
  nMatched: number
  nModified: number
  nUpserted: number
  nRemoved: number
  upserted: { index: number; _id: string }[]
  writeErrors: { index: number; errmsg: string }[]
}

export interface UpdateOptions {
  upsert?: boolean
}

export interface FindOneAndUpdateOptions {
  upsert?: boolean
  returnDocument?: "before" | "after"
  projection?: Record<string, 0 | 1>
  sort?: Record<string, SortDirection>
}

export interface FindOneAndDeleteOptions {
  projection?: Record<string, 0 | 1>
  sort?: Record<string, SortDirection>
}

export interface FindOneAndReplaceOptions {
  upsert?: boolean
  returnDocument?: "before" | "after"
  projection?: Record<string, 0 | 1>
  sort?: Record<string, SortDirection>
}

export interface BulkWriteOperation {
  insertOne?: { document: Document }
  updateOne?: { filter: Filter; update: Update; upsert?: boolean }
  updateMany?: { filter: Filter; update: Update }
  deleteOne?: { filter: Filter }
  deleteMany?: { filter: Filter }
  replaceOne?: { filter: Filter; replacement: Document; upsert?: boolean }
}

export type Operation =
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

export interface MongoBody {
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
    update?: Record<string, unknown>
  }[]
  options?: {
    sort?: Record<string, SortDirection>
    limit?: number
    skip?: number
    projection?: Record<string, 0 | 1>
    upsert?: boolean
    returnDocument?: "before" | "after"
  }
}

export type MongoDXAuth = { username: string; password: string }

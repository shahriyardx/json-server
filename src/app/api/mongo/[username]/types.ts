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
  | "aggregate"

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
    documents?: Record<string, unknown>[]
    update?: Record<string, unknown>
    upsert?: boolean
  }[]
  pipeline?: Record<string, unknown>[]
  options?: {
    sort?: Record<string, 1 | -1>
    limit?: number
    skip?: number
    projection?: Record<string, 0 | 1>
    upsert?: boolean
    returnDocument?: "before" | "after"
  }
}

export const ALLOWED_OPS = new Set<Operation>([
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
  "aggregate",
])

export type ParsedDoc = Record<string, unknown> & { __prismaId?: string }

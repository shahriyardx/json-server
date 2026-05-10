// ---- ObjectId ----

let objectIdCounter = Math.floor(Math.random() * 0xffffff)

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0")
  const random = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0"),
  ).join("")
  const counter = (objectIdCounter++ % 0xffffff).toString(16).padStart(6, "0")
  return timestamp + random + counter
}

export class ObjectId {
  private hex: string

  constructor(id?: string) {
    if (id) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new Error(`Invalid ObjectId: "${id}" must be a 24-char hex string`)
      }
      this.hex = id.toLowerCase()
    } else {
      this.hex = generateObjectId()
    }
  }

  toString(): string {
    return this.hex
  }

  toHexString(): string {
    return this.hex
  }

  toJSON(): string {
    return this.hex
  }

  equals(other: ObjectId): boolean {
    return this.hex === other.hex
  }

  static isValid(hex: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(hex)
  }
}

// ---- Types ----

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

type MongoDXAuth = { username: string; password: string }

// ---- URI parser ----

function parseUri(uri: string): {
  username: string
  baseUrl: string
  auth: MongoDXAuth
  defaultDb: string | null
} {
  const url = new URL(uri)

  // Extract platform username from host subdomain
  // e.g. shahriyardx.json.shahriyar.dev → username=shahriyardx, domain=json.shahriyar.dev
  // e.g. shahriyardx.localhost → username=shahriyardx, domain=localhost
  const hostParts = url.hostname.split(".")
  if (hostParts.length < 2) {
    throw new Error(
      "Host must include platform username as subdomain. " +
        'e.g. "username.json.shahriyar.dev" or "username.localhost"',
    )
  }
  const platformUser = hostParts[0]
  const domain = hostParts.slice(1).join(".")

  const protocol =
    domain === "localhost" || domain.startsWith("localhost:")
      ? "http"
      : "https"
  const baseUrl = `${protocol}://${domain}${url.port ? `:${url.port}` : ""}`

  // Auth: Basic (user:password)
  if (!url.username || !url.password) {
    throw new Error(
      "URI must include database user:password, e.g. mongodb://dbuser:dbpass@host/db",
    )
  }
  const auth: MongoDXAuth = { username: url.username, password: url.password }

  const defaultDb = url.pathname.replace(/^\//, "") || null

  return { username: platformUser, baseUrl, auth, defaultDb }
}

export class MongodxServerError extends Error {
  readonly code: number
  readonly status: number
  readonly errmsg: string
  readonly codeName: string

  private static statusMeta(status: number): { code: number; codeName: string } {
    switch (status) {
      case 401: return { code: 8000, codeName: "MongodxError" }
      case 403: return { code: 13, codeName: "Unauthorized" }
      case 404: return { code: 26, codeName: "NamespaceNotFound" }
      case 409: return { code: 11000, codeName: "DuplicateKey" }
      case 422: return { code: 2, codeName: "BadValue" }
      default: return { code: 0, codeName: "UnknownError" }
    }
  }

  constructor(status: number, message: string, code?: number) {
    const meta = MongodxServerError.statusMeta(status)
    const finalCode = code ?? meta.code
    const fullMsg = `MongodxServerError: ${message}`
    super(fullMsg)
    this.name = "MongodxServerError"
    this.status = status
    this.code = finalCode
    this.codeName = meta.codeName
    this.errmsg = message
  }
}

export class MongodxBulkWriteError extends Error {
  readonly code: number
  readonly status: number
  readonly errmsg: string
  readonly writeErrors: { index: number; errmsg: string }[]

  constructor(
    status: number,
    message: string,
    writeErrors: { index: number; errmsg: string }[] = [],
  ) {
    const fullMsg = `MongodxBulkWriteError: ${message}`
    super(fullMsg)
    this.name = "MongodxBulkWriteError"
    this.status = status
    this.code = 11000
    this.errmsg = message
    this.writeErrors = writeErrors
  }
}

// ---- HTTP client ----

function statusToMongoMsg(status: number, fallback: string): string {
  switch (status) {
    case 401: return `bad auth Authentication failed.`
    case 403: return `not authorized for query`
    case 404: return `ns not found`
    case 409: return `E11000 duplicate key error`
    case 422: return `bad value ${fallback}`
    default: return fallback
  }
}

async function mongoRequest(
  baseUrl: string,
  endpoint: string,
  body: MongoBody,
  auth: MongoDXAuth,
): Promise<unknown> {
  const url = `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errBody = body as { error?: string; code?: number; writeErrors?: { index: number; errmsg: string }[] }

    const message = errBody.error ?? res.statusText

    if (res.status === 409 && errBody.writeErrors) {
      throw new MongodxBulkWriteError(res.status, message, errBody.writeErrors)
    }

    const mongoMsg = statusToMongoMsg(res.status, message)
    throw new MongodxServerError(res.status, mongoMsg, errBody.code)
  }

  return res.json()
}

// ---- FindCursor ----

export class FindCursor {
  private db: DB
  private collection: string
  private filter: Record<string, unknown>
  private opts: FindOptions = {}

  constructor(db: DB, collection: string, filter: Record<string, unknown>, options?: FindOptions) {
    this.db = db
    this.collection = collection
    this.filter = filter
    if (options) this.opts = { ...options }
  }

  sort(sort: Record<string, SortDirection>): FindCursor {
    this.opts.sort = sort
    return this
  }

  limit(limit: number): FindCursor {
    this.opts.limit = limit
    return this
  }

  skip(skip: number): FindCursor {
    this.opts.skip = skip
    return this
  }

  project(projection: Record<string, 0 | 1>): FindCursor {
    this.opts.projection = projection
    return this
  }

  async toArray(): Promise<Document[]> {
    return this.db.exec<FindResult>({
      operation: "find",
      collection: this.collection,
      filter: this.filter,
      options: this.opts as MongoBody["options"],
    }).then((r) => r.data)
  }
}

// ---- Collection ----

function toOpFilter(filter?: Filter): Record<string, unknown> | undefined {
  return filter as Record<string, unknown> | undefined
}

export class Collection {
  private db: DB
  readonly name: string

  constructor(db: DB, name: string) {
    this.db = db
    this.name = name
  }

  private async exec<T>(body: Omit<MongoBody, "database" | "collection">): Promise<T> {
    return this.db.exec<T>({ ...body, collection: this.name })
  }

  find(filter?: Filter, options?: FindOptions): FindCursor {
    return new FindCursor(this.db, this.name, (filter ?? {}) as Record<string, unknown>, options)
  }

  findOne(filter: Filter, options?: FindOptions): Promise<Document | null> {
    return this.exec<FindResult>({
      operation: "find",
      filter: toOpFilter(filter),
      options: { ...options, limit: 1 } as MongoBody["options"],
    }).then((r) => r.data[0] ?? null)
  }

  findById(id: string | ObjectId): Promise<Document | null> {
    return this.findOne({ _id: id } as Filter)
  }

  insertOne(document: Document): Promise<InsertResult> {
    return this.exec<InsertResult>({ operation: "insertOne", document })
  }

  insertMany(documents: Document[]): Promise<InsertManyResult> {
    return this.exec<InsertManyResult>({ operation: "insertMany", documents })
  }

  updateOne(filter: Filter, update: Update, options?: UpdateOptions): Promise<UpdateResult> {
    return this.exec<UpdateResult>({
      operation: "updateOne",
      filter: toOpFilter(filter),
      update,
      options: { upsert: options?.upsert } as MongoBody["options"],
    })
  }

  updateMany(filter: Filter, update: Update, options?: UpdateOptions): Promise<UpdateResult> {
    return this.exec<UpdateResult>({
      operation: "updateMany",
      filter: toOpFilter(filter),
      update,
      options: { upsert: options?.upsert } as MongoBody["options"],
    })
  }

  deleteOne(filter: Filter): Promise<DeleteResult> {
    return this.exec<DeleteResult>({ operation: "deleteOne", filter: toOpFilter(filter) })
  }

  deleteMany(filter: Filter): Promise<DeleteResult> {
    return this.exec<DeleteResult>({ operation: "deleteMany", filter: toOpFilter(filter) })
  }

  countDocuments(filter?: Filter): Promise<number> {
    return this.exec<CountResult>({
      operation: "countDocuments",
      filter: toOpFilter(filter),
    }).then((r) => r.count)
  }

  estimatedDocumentCount(): Promise<number> {
    return this.exec<CountResult>({ operation: "estimatedDocumentCount" }).then((r) => r.count)
  }

  distinct(key: string, filter?: Filter): Promise<unknown[]> {
    return this.exec<DistinctResult>({
      operation: "distinct",
      key,
      filter: toOpFilter(filter),
    }).then((r) => r.values)
  }

  replaceOne(filter: Filter, replacement: Document, options?: UpdateOptions): Promise<UpdateResult> {
    return this.exec<UpdateResult>({
      operation: "replaceOne",
      filter: toOpFilter(filter),
      document: replacement,
      options: { upsert: options?.upsert } as MongoBody["options"],
    })
  }

  findOneAndUpdate(filter: Filter, update: Update, options?: FindOneAndUpdateOptions): Promise<Document | null> {
    return this.exec<Document | null>({
      operation: "findOneAndUpdate",
      filter: toOpFilter(filter),
      update,
      options: {
        upsert: options?.upsert,
        returnDocument: options?.returnDocument,
        projection: options?.projection,
        sort: options?.sort,
      } as MongoBody["options"],
    })
  }

  findOneAndDelete(filter: Filter, options?: FindOneAndDeleteOptions): Promise<Document | null> {
    return this.exec<Document | null>({
      operation: "findOneAndDelete",
      filter: toOpFilter(filter),
      options: {
        projection: options?.projection,
        sort: options?.sort,
      } as MongoBody["options"],
    })
  }

  findOneAndReplace(filter: Filter, replacement: Document, options?: FindOneAndReplaceOptions): Promise<Document | null> {
    return this.exec<Document | null>({
      operation: "findOneAndReplace",
      filter: toOpFilter(filter),
      document: replacement,
      options: {
        upsert: options?.upsert,
        returnDocument: options?.returnDocument,
        projection: options?.projection,
        sort: options?.sort,
      } as MongoBody["options"],
    })
  }

  bulkWrite(operations: BulkWriteOperation[]): Promise<BulkWriteResult> {
    const ops = operations.map((op) => {
      if (op.insertOne) return { operation: "insertOne", document: op.insertOne.document }
      if (op.updateOne) return { operation: "updateOne", filter: toOpFilter(op.updateOne.filter), update: op.updateOne.update }
      if (op.updateMany) return { operation: "updateMany", filter: toOpFilter(op.updateMany.filter), update: op.updateMany.update }
      if (op.deleteOne) return { operation: "deleteOne", filter: toOpFilter(op.deleteOne.filter) }
      if (op.deleteMany) return { operation: "deleteMany", filter: toOpFilter(op.deleteMany.filter) }
      if (op.replaceOne) return { operation: "replaceOne", filter: toOpFilter(op.replaceOne.filter), document: op.replaceOne.replacement }
      throw new Error(`Unknown bulkWrite operation`)
    })
    return this.exec<BulkWriteResult>({ operation: "bulkWrite", operations: ops })
  }
}

// ---- DB ----

export class DB {
  private client: MongoClient
  readonly name: string

  constructor(client: MongoClient, name: string) {
    this.client = client
    this.name = name
  }

  collection(name: string): Collection {
    return new Collection(this, name)
  }

  async exec<T>(body: Omit<MongoBody, "database">): Promise<T> {
    return this.client.exec<T>({ ...body, database: this.name })
  }
}

// ---- MongoClient ----

export class MongoClient {
  private baseUrl: string
  private username: string
  private auth: MongoDXAuth
  private defaultDb: string | null

  constructor(uri: string) {
    const parsed = parseUri(uri)
    this.baseUrl = parsed.baseUrl
    this.username = parsed.username
    this.auth = parsed.auth
    this.defaultDb = parsed.defaultDb
  }

  /** Connect to MongoDB. Verifies credentials via ping. */
  async connect(): Promise<this> {
    await this.exec<{ ok: number }>({
      operation: "ping",
      database: "admin",
      collection: "ping",
    })
    return this
  }

  /** Create a client and connect. Alias for `new MongoClient(uri)` for drop-in compat. */
  static async connect(uri: string): Promise<MongoClient> {
    const client = new MongoClient(uri)
    return client.connect()
  }

  /** Close the connection. No-op in mongodx. */
  async close(): Promise<void> {
    // no-op
  }

  db(name?: string): DB {
    return new DB(this, name ?? this.defaultDb ?? "default")
  }

  async exec<T>(body: MongoBody): Promise<T> {
    return mongoRequest(
      this.baseUrl,
      `api/mongo/${this.username}`,
      body,
      this.auth,
    ) as Promise<T>
  }
}

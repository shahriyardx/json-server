import type { Document, FindOptions, FindResult, SortDirection } from "./types"
import type { DB } from "./db"

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
      options: this.opts,
    }).then((r) => r.data)
  }
}

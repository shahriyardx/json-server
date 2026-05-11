import type { Filter, Document, Update, FindOptions, UpdateOptions, FindOneAndUpdateOptions, FindOneAndDeleteOptions, FindOneAndReplaceOptions, BulkWriteOperation, InsertResult, InsertManyResult, UpdateResult, DeleteResult, CountResult, FindResult, DistinctResult, BulkWriteResult, SortDirection } from "./types"
import type { MongoBody } from "./types"
import type { DB } from "./db"
import { FindCursor } from "./cursor"

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

  findById(id: string | { toString(): string }): Promise<Document | null> {
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
      throw new Error("Unknown bulkWrite operation")
    })
    return this.exec<BulkWriteResult>({ operation: "bulkWrite", operations: ops })
  }
}

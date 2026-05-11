import type { MongoBody } from "./types"
import type { MongoClient } from "./client"
import { Collection } from "./collection"

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

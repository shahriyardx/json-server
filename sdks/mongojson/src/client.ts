import { parseUri } from "./uri"
import { mongoRequest } from "./http"
import { DB } from "./db"
import type { MongoBody, MongoClientOptions } from "./types"

export class MongoClient {
  private baseUrl: string
  private username: string
  private auth: { username: string; password: string }
  private defaultDb: string | null
  readonly options: MongoClientOptions

  constructor(uri: string, options?: MongoClientOptions) {
    const parsed = parseUri(uri)
    this.baseUrl = parsed.baseUrl
    this.username = parsed.username
    this.auth = parsed.auth
    this.defaultDb = parsed.defaultDb
    this.options = options ?? {}
  }

  /** Connect to server. Verifies credentials via ping. */
  async connect(): Promise<this> {
    await this.exec<{ ok: number }>({
      operation: "ping",
      database: "admin",
      collection: "ping",
    })
    return this
  }

  /** Create a client and connect. */
  static async connect(uri: string): Promise<MongoClient> {
    const client = new MongoClient(uri)
    return client.connect()
  }

  /** Close connection. No-op in mongojson. */
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

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test"
import {
  MongoClient,
  ObjectId,
  MongojsonServerError,
  MongojsonBulkWriteError,
  type Collection,
  type DB,
} from "../src/index"
import { parseUri } from "../src/uri"
import type { Document } from "../src/types"

const URI = process.env.MONGOJSON_URI ?? ""
const TEST_DB = "test_sdk"

if (!URI) {
  console.error("MONGOJSON_URI not set in .env — integration tests will skip")
}

// ---------------------------------------------------------------------------
// Unit tests — no server needed
// ---------------------------------------------------------------------------

describe("ObjectId", () => {
  it("generates 24-char hex string", () => {
    const id = new ObjectId()
    expect(id.toString()).toMatch(/^[0-9a-f]{24}$/)
    expect(id.toHexString()).toBe(id.toString())
    expect(id.toJSON()).toBe(id.toString())
  })

  it("accepts valid 24-char hex", () => {
    const hex = "507f1f77bcf86cd799439011"
    const id = new ObjectId(hex)
    expect(id.toString()).toBe(hex)
  })

  it("rejects invalid hex", () => {
    expect(() => new ObjectId("short")).toThrow(/24-char hex/)
    expect(() => new ObjectId("zzzzzzzzzzzzzzzzzzzzzzzz")).toThrow(
      /24-char hex/,
    )
  })

  it("equals works", () => {
    const a = new ObjectId("507f1f77bcf86cd799439011")
    const b = new ObjectId("507f1f77bcf86cd799439011")
    const c = new ObjectId("507f1f77bcf86cd799439012")
    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })

  it("isValid static check", () => {
    expect(ObjectId.isValid("507f1f77bcf86cd799439011")).toBe(true)
    expect(ObjectId.isValid("invalid")).toBe(false)
    expect(ObjectId.isValid("")).toBe(false)
  })

  it("100 generated ids are all unique", () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => new ObjectId().toString()),
    )
    expect(ids.size).toBe(100)
  })
})

describe("URI parsing", () => {
  it("parses valid mongojson URI", () => {
    const parsed = parseUri(
      "mongodb://dbuser:dbpass@shahriyardx.json.shahriyar.dev/mydb",
    )
    expect(parsed.username).toBe("shahriyardx")
    expect(parsed.auth.username).toBe("dbuser")
    expect(parsed.auth.password).toBe("dbpass")
    expect(parsed.baseUrl).toBe("https://json.shahriyar.dev")
    expect(parsed.defaultDb).toBe("mydb")
  })

  it("parses localhost URI with http and port", () => {
    const parsed = parseUri("mongodb://user:pass@test.localhost:3000/mydb")
    expect(parsed.username).toBe("test")
    expect(parsed.baseUrl).toBe("http://localhost:3000")
    expect(parsed.defaultDb).toBe("mydb")
  })

  it("parses localhost URI without port", () => {
    const parsed = parseUri("mongodb://user:pass@test.localhost/mydb")
    expect(parsed.baseUrl).toBe("http://localhost")
  })

  it("defaultDb null when no path", () => {
    const parsed = parseUri("mongodb://user:pass@test.localhost")
    expect(parsed.defaultDb).toBeNull()
  })

  it("throws on missing credentials", () => {
    expect(() => parseUri("mongodb://test.localhost/db")).toThrow(
      /user:password/,
    )
    expect(() => parseUri("mongodb://user@test.localhost/db")).toThrow(
      /user:password/,
    )
  })

  it("throws when host lacks subdomain", () => {
    expect(() => parseUri("mongodb://user:pass@localhost/db")).toThrow(
      /subdomain/,
    )
  })
})

describe("MongojsonServerError", () => {
  it("401 → code 8000 MongojsonError", () => {
    const e = new MongojsonServerError(401, "bad auth")
    expect(e.code).toBe(8000)
    expect(e.codeName).toBe("MongojsonError")
    expect(e.status).toBe(401)
    expect(e.errmsg).toBe("bad auth")
  })

  it("403 → code 13 Unauthorized", () => {
    const e = new MongojsonServerError(403, "forbidden")
    expect(e.code).toBe(13)
    expect(e.codeName).toBe("Unauthorized")
  })

  it("404 → code 26 NamespaceNotFound", () => {
    const e = new MongojsonServerError(404, "not found")
    expect(e.code).toBe(26)
    expect(e.codeName).toBe("NamespaceNotFound")
  })

  it("409 → code 11000 DuplicateKey", () => {
    const e = new MongojsonServerError(409, "duplicate")
    expect(e.code).toBe(11000)
    expect(e.codeName).toBe("DuplicateKey")
  })

  it("422 → code 2 BadValue", () => {
    const e = new MongojsonServerError(422, "bad value")
    expect(e.code).toBe(2)
    expect(e.codeName).toBe("BadValue")
  })

  it("unknown status → code 0 UnknownError", () => {
    const e = new MongojsonServerError(500, "internal")
    expect(e.code).toBe(0)
    expect(e.codeName).toBe("UnknownError")
  })

  it("accepts custom code override", () => {
    const e = new MongojsonServerError(400, "custom", 12345)
    expect(e.code).toBe(12345)
  })

  it("message includes MongojsonServerError prefix", () => {
    const e = new MongojsonServerError(500, "server error")
    expect(e.message).toContain("MongojsonServerError: server error")
  })
})

describe("MongojsonBulkWriteError", () => {
  it("stores writeErrors", () => {
    const e = new MongojsonBulkWriteError(409, "batch error", [
      { index: 0, errmsg: "duplicate key" },
    ])
    expect(e.writeErrors).toHaveLength(1)
    expect(e.writeErrors[0].errmsg).toBe("duplicate key")
    expect(e.code).toBe(11000)
  })

  it("defaults writeErrors to empty", () => {
    const e = new MongojsonBulkWriteError(409, "error")
    expect(e.writeErrors).toEqual([])
  })

  it("message includes MongojsonBulkWriteError prefix", () => {
    const e = new MongojsonBulkWriteError(500, "bulk error")
    expect(e.message).toContain("MongojsonBulkWriteError: bulk error")
  })
})

// ---------------------------------------------------------------------------
// Integration helpers
// ---------------------------------------------------------------------------
// Run:  cd sdks/mongojson && bun test
// Env:  MONGOJSON_URI="mongodb://dbuser:dbpass@youruser.localhost:3000/test_sdk"

let client: MongoClient | null = null
let db: DB | null = null

function getCtx() {
  if (!client || !db) throw new Error("Server not available")
  return { client, db }
}

beforeAll(async () => {
  try {
    const c = new MongoClient(URI)
    await c.connect()
    client = c
    db = c.db(TEST_DB)
  } catch {
    // offline — tests will skip
  }
})

afterAll(async () => {
  await client?.close()
})

function isOffline(): boolean {
  return !client || !db
}

async function seed(c: Collection, docs: Document[]): Promise<void> {
  if (docs.length === 0) return
  await c.insertMany(docs)
}

function itIf(msg: string, fn: () => void | Promise<void>) {
  it(msg, async () => {
    if (isOffline()) return
    await fn()
  })
}

// ---------------------------------------------------------------------------
// Integration: ping
// ---------------------------------------------------------------------------

describe("integration: ping", () => {
  itIf("connects with valid credentials", async () => {
    const c2 = new MongoClient(URI)
    const result = await c2.connect()
    expect(result).toBe(c2)
    await c2.close()
  })

  itIf("throws MongojsonServerError on bad credentials", async () => {
    const badUri = URI.replace(/\/\/[^@]+@/, "//bad:creds@")
    const c2 = new MongoClient(badUri)
    await expect(c2.connect()).rejects.toThrow(MongojsonServerError)
  })
})

// ---------------------------------------------------------------------------
// Integration: insertOne
// ---------------------------------------------------------------------------

describe("integration: insertOne", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("insertOne")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("auto-generated id", async () => {
    const r = await c.insertOne({ name: "Alice", age: 30 })
    expect(r.acknowledged).toBe(true)
    expect(r.insertedId).toBeDefined()
  })

  itIf("with explicit _id", async () => {
    const r = await c.insertOne({ _id: 1, name: "Bob" })
    expect(r.insertedId).toBe(1)
  })

  itIf("with id field", async () => {
    const r = await c.insertOne({ id: "u1", name: "Charlie" })
    expect(r.insertedId).toBe("u1")
  })

  itIf("rejects duplicate _id", async () => {
    await c.insertOne({ _id: 42, name: "First" })
    await expect(c.insertOne({ _id: 42, name: "Second" })).rejects.toThrow(
      MongojsonServerError,
    )
  })

  itIf("rejects duplicate id", async () => {
    await c.insertOne({ id: "x1", name: "A" })
    await expect(c.insertOne({ id: "x1", name: "B" })).rejects.toThrow(
      MongojsonServerError,
    )
  })

  itIf("nested objects and arrays", async () => {
    await c.insertOne({
      name: "Deep",
      addr: { street: "Main", city: "NYC" },
      tags: ["a", "b"],
    })
    const found = (await c.findOne({ name: "Deep" })) as Document
    expect(found.addr).toEqual({ street: "Main", city: "NYC" })
    expect(found.tags).toEqual(["a", "b"])
  })
})

// ---------------------------------------------------------------------------
// Integration: insertMany
// ---------------------------------------------------------------------------

describe("integration: insertMany", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("insertMany")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("multiple documents", async () => {
    const r = await c.insertMany([
      { name: "A", v: 1 },
      { name: "B", v: 2 },
      { name: "C", v: 3 },
    ])
    expect(r.acknowledged).toBe(true)
    expect(r.insertedIds).toHaveLength(3)
    expect(await c.countDocuments()).toBe(3)
  })

  itIf("rejects batch with duplicate _id", async () => {
    await c.insertOne({ _id: 99, name: "Existing" })
    await expect(
      c.insertMany([
        { _id: 200, name: "New" },
        { _id: 99, name: "Dup" },
      ]),
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Integration: find
// ---------------------------------------------------------------------------

describe("integration: find", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("find")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("all documents", async () => {
    await seed(c, [{ x: 1 }, { x: 2 }, { x: 3 }])
    expect(await c.find({}).toArray()).toHaveLength(3)
  })

  itIf("with $gt filter", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }, { v: 3 }])
    expect(await c.find({ v: { $gt: 1 } }).toArray()).toHaveLength(2)
  })

  itIf("sort ascending", async () => {
    await seed(c, [
      { n: "C", v: 3 },
      { n: "A", v: 1 },
      { n: "B", v: 2 },
    ])
    const docs = await c.find({}, { sort: { v: 1 } }).toArray()
    expect(docs[0].v).toBe(1)
    expect(docs[2].v).toBe(3)
  })

  itIf("sort descending", async () => {
    await seed(c, [
      { n: "C", v: 3 },
      { n: "A", v: 1 },
      { n: "B", v: 2 },
    ])
    const docs = await c.find({}, { sort: { v: -1 } }).toArray()
    expect(docs[0].v).toBe(3)
    expect(docs[2].v).toBe(1)
  })

  itIf("limit", async () => {
    await seed(
      c,
      Array.from({ length: 10 }, (_, i) => ({ i })),
    )
    expect(await c.find({}, { limit: 3 }).toArray()).toHaveLength(3)
  })

  itIf("skip", async () => {
    await seed(
      c,
      Array.from({ length: 5 }, (_, i) => ({ i })),
    )
    const docs = await c.find({}, { skip: 2 }).toArray()
    expect(docs).toHaveLength(3)
    expect(docs[0].i).toBe(2)
  })

  itIf("projection inclusion", async () => {
    await seed(c, [{ name: "X", secret: "s1", visible: "v1" }])
    const docs = await c
      .find({}, { projection: { name: 1, visible: 1 } })
      .toArray()
    expect(docs[0].name).toBe("X")
    expect(docs[0].visible).toBe("v1")
    expect(docs[0].secret).toBeUndefined()
  })

  itIf("projection exclusion", async () => {
    await seed(c, [{ name: "Y", secret: "s2" }])
    const docs = await c.find({}, { projection: { secret: 0 } }).toArray()
    expect(docs[0].name).toBe("Y")
    expect(docs[0].secret).toBeUndefined()
  })

  itIf("empty result for no match", async () => {
    expect(await c.find({ nonexistent: true }).toArray()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Integration: findOne
// ---------------------------------------------------------------------------

describe("integration: findOne", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("findOne")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("first match", async () => {
    await seed(c, [
      { g: "a", v: 1 },
      { g: "a", v: 2 },
    ])
    expect(((await c.findOne({ g: "a" })) as Document).v).toBe(1)
  })

  itIf("null for no match", async () => {
    expect(await c.findOne({ x: "missing" })).toBeNull()
  })

  itIf("null on empty collection", async () => {
    expect(await c.findOne({})).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Integration: findById
// ---------------------------------------------------------------------------

describe("integration: findById", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("findById")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("finds by string _id", async () => {
    await c.insertOne({ _id: "target_id", name: "Target" })
    expect(((await c.findById("target_id")) as Document).name).toBe("Target")
  })

  itIf("null for missing", async () => {
    expect(await c.findById("nonexistent")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Integration: countDocuments
// ---------------------------------------------------------------------------

describe("integration: countDocuments", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("countDocuments")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("all", async () => {
    await seed(
      c,
      Array.from({ length: 7 }, (_, i) => ({ i })),
    )
    expect(await c.countDocuments()).toBe(7)
  })

  itIf("with filter", async () => {
    await seed(c, [{ t: "a" }, { t: "b" }, { t: "a" }])
    expect(await c.countDocuments({ t: "a" })).toBe(2)
  })

  itIf("0 for no match", async () => {
    await seed(c, [{ x: 1 }])
    expect(await c.countDocuments({ x: 999 })).toBe(0)
  })

  itIf("0 on empty", async () => {
    expect(await c.countDocuments()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: estimatedDocumentCount
// ---------------------------------------------------------------------------

describe("integration: estimatedDocumentCount", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("estimatedDocCount")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("returns count", async () => {
    await seed(
      c,
      Array.from({ length: 5 }, (_, i) => ({ i })),
    )
    expect(await c.estimatedDocumentCount()).toBe(5)
  })

  itIf("0 on empty", async () => {
    expect(await c.estimatedDocumentCount()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: distinct
// ---------------------------------------------------------------------------

describe("integration: distinct", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("distinct")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("distinct values", async () => {
    await seed(c, [{ c: "red" }, { c: "blue" }, { c: "red" }, { c: "green" }])
    expect((await c.distinct("c")).sort()).toEqual(["blue", "green", "red"])
  })

  itIf("with filter", async () => {
    await seed(c, [
      { g: "a", c: "red" },
      { g: "a", c: "blue" },
      { g: "b", c: "red" },
    ])
    expect((await c.distinct("c", { g: "a" })).sort()).toEqual(["blue", "red"])
  })

  itIf("empty for missing key", async () => {
    await seed(c, [{ a: 1 }])
    expect(await c.distinct("nonexistent")).toEqual([])
  })

  itIf("empty on empty collection", async () => {
    expect(await c.distinct("x")).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Integration: updateOne
// ---------------------------------------------------------------------------

describe("integration: updateOne", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("updateOne")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("match and modify ($set)", async () => {
    await seed(c, [{ name: "Old", v: 1 }])
    const r = await c.updateOne(
      { name: "Old" },
      { $set: { name: "New", v: 2 } },
    )
    expect(r.matchedCount).toBe(1)
    expect(r.modifiedCount).toBe(1)
    expect(((await c.findOne({ name: "New" } as never)) as Document).v).toBe(2)
  })

  itIf("no match, no upsert", async () => {
    const r = await c.updateOne({ x: "missing" }, { $set: { y: 1 } })
    expect(r.matchedCount).toBe(0)
    expect(r.modifiedCount).toBe(0)
  })

  itIf("upsert when no match", async () => {
    const r = await c.updateOne(
      { name: "Upserted" },
      { $set: { v: 100 } },
      { upsert: true },
    )
    expect(r.upsertedCount).toBe(1)
    expect(r.upsertedId).toBeDefined()
    expect(((await c.findOne({ name: "Upserted" })) as Document).v).toBe(100)
  })

  itIf("0 modified when unchanged", async () => {
    await seed(c, [{ name: "S", v: 5 }])
    expect(
      (await c.updateOne({ name: "S" }, { $set: { v: 5 } })).modifiedCount,
    ).toBe(0)
  })

  itIf("$unset removes field", async () => {
    await seed(c, [{ name: "X", tmp: "yes", keep: "this" }])
    await c.updateOne({ name: "X" }, { $unset: { tmp: "" } })
    const doc = (await c.findOne({ name: "X" })) as Document
    expect(doc.tmp).toBeUndefined()
    expect(doc.keep).toBe("this")
  })

  itIf("$inc increments", async () => {
    await seed(c, [{ name: "C", count: 10 }])
    await c.updateOne({ name: "C" }, { $inc: { count: 5 } })
    expect(((await c.findOne({ name: "C" })) as Document).count).toBe(15)
  })

  itIf("$inc decrements with negative", async () => {
    await seed(c, [{ name: "D", count: 10 }])
    await c.updateOne({ name: "D" }, { $inc: { count: -3 } })
    expect(((await c.findOne({ name: "D" })) as Document).count).toBe(7)
  })

  itIf("$mul multiplies", async () => {
    await seed(c, [{ name: "M", v: 10 }])
    await c.updateOne({ name: "M" }, { $mul: { v: 3 } })
    expect(((await c.findOne({ name: "M" })) as Document).v).toBe(30)
  })

  itIf("$min takes lower", async () => {
    await seed(c, [{ name: "Min", v: 10 }])
    await c.updateOne({ name: "Min" }, { $min: { v: 5 } })
    expect(((await c.findOne({ name: "Min" })) as Document).v).toBe(5)
    await c.updateOne({ name: "Min" }, { $min: { v: 7 } })
    expect(((await c.findOne({ name: "Min" })) as Document).v).toBe(5)
  })

  itIf("$max takes higher", async () => {
    await seed(c, [{ name: "Max", v: 10 }])
    await c.updateOne({ name: "Max" }, { $max: { v: 20 } })
    expect(((await c.findOne({ name: "Max" })) as Document).v).toBe(20)
    await c.updateOne({ name: "Max" }, { $max: { v: 5 } })
    expect(((await c.findOne({ name: "Max" })) as Document).v).toBe(20)
  })

  itIf("$rename field", async () => {
    await seed(c, [{ name: "R", oldF: "value" }])
    await c.updateOne({ name: "R" }, { $rename: { oldF: "newF" } })
    const doc = (await c.findOne({ name: "R" })) as Document
    expect(doc.oldF).toBeUndefined()
    expect(doc.newF).toBe("value")
  })

  itIf("$push appends to array", async () => {
    await seed(c, [{ name: "Arr", items: [1, 2] }])
    await c.updateOne({ name: "Arr" }, { $push: { items: 3 } })
    expect(((await c.findOne({ name: "Arr" })) as Document).items).toEqual([
      1, 2, 3,
    ])
  })

  itIf("$push creates array when field missing", async () => {
    await seed(c, [{ name: "NoArr" }])
    await c.updateOne({ name: "NoArr" }, { $push: { items: "first" } })
    expect(((await c.findOne({ name: "NoArr" })) as Document).items).toEqual([
      "first",
    ])
  })

  itIf("$addToSet adds unique value only", async () => {
    await seed(c, [{ name: "S", vals: [1, 2] }])
    await c.updateOne({ name: "S" }, { $addToSet: { vals: 3 } })
    expect(((await c.findOne({ name: "S" })) as Document).vals).toEqual([
      1, 2, 3,
    ])
    await c.updateOne({ name: "S" }, { $addToSet: { vals: 2 } })
    expect(((await c.findOne({ name: "S" })) as Document).vals).toEqual([
      1, 2, 3,
    ])
  })

  itIf("$pull removes matching value", async () => {
    await seed(c, [{ name: "P", vals: [1, 2, 3, 2] }])
    await c.updateOne({ name: "P" }, { $pull: { vals: 2 } })
    expect(((await c.findOne({ name: "P" })) as Document).vals).toEqual([1, 3])
  })
})

// ---------------------------------------------------------------------------
// Integration: updateMany
// ---------------------------------------------------------------------------

describe("integration: updateMany", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("updateMany")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("updates all matching", async () => {
    await seed(c, [
      { g: "a", v: 1 },
      { g: "a", v: 2 },
      { g: "b", v: 3 },
    ])
    const r = await c.updateMany({ g: "a" }, { $set: { tagged: true } })
    expect(r.matchedCount).toBe(2)
    expect(r.modifiedCount).toBe(2)
    const docs = await c.find({ g: "a" }).toArray()
    expect(docs.every((d) => d.tagged === true)).toBe(true)
  })

  itIf("0 modified when unchanged", async () => {
    await seed(c, [
      { g: "x", v: 5 },
      { g: "x", v: 5 },
    ])
    expect(
      (await c.updateMany({ g: "x" }, { $set: { v: 5 } })).modifiedCount,
    ).toBe(0)
  })

  itIf("0 match when no match", async () => {
    await seed(c, [{ a: 1 }])
    const r = await c.updateMany({ nonexistent: true }, { $set: { x: 1 } })
    expect(r.matchedCount).toBe(0)
    expect(r.modifiedCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: deleteOne
// ---------------------------------------------------------------------------

describe("integration: deleteOne", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("deleteOne")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("deletes one", async () => {
    await seed(c, [{ n: "A" }, { n: "B" }])
    expect((await c.deleteOne({ n: "A" })).deletedCount).toBe(1)
    expect(await c.countDocuments()).toBe(1)
  })

  itIf("0 for no match", async () => {
    await seed(c, [{ n: "X" }])
    expect((await c.deleteOne({ n: "missing" })).deletedCount).toBe(0)
  })

  itIf("0 on empty", async () => {
    expect((await c.deleteOne({})).deletedCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: deleteMany
// ---------------------------------------------------------------------------

describe("integration: deleteMany", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("deleteMany")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("deletes all matching", async () => {
    await seed(c, [{ g: "a" }, { g: "a" }, { g: "b" }])
    expect((await c.deleteMany({ g: "a" })).deletedCount).toBe(2)
    expect(await c.countDocuments()).toBe(1)
  })

  itIf("empty filter deletes all", async () => {
    await seed(c, [{ x: 1 }, { x: 2 }])
    expect((await c.deleteMany({})).deletedCount).toBe(2)
  })

  itIf("0 for no match", async () => {
    await seed(c, [{ a: 1 }])
    expect((await c.deleteMany({ a: 999 })).deletedCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: replaceOne
// ---------------------------------------------------------------------------

describe("integration: replaceOne", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("replaceOne")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("preserves _id", async () => {
    await c.insertOne({ _id: "rid1", name: "Old", v: 1 })
    const r = await c.replaceOne({ _id: "rid1" }, { name: "New", v: 2 })
    expect(r.matchedCount).toBe(1)
    expect(r.modifiedCount).toBe(1)
    const doc = (await c.findOne({ _id: "rid1" })) as Document
    expect(doc._id).toBe("rid1")
    expect(doc.name).toBe("New")
    expect(doc.v).toBe(2)
  })

  itIf("0 match for no match", async () => {
    const r = await c.replaceOne({ _id: "nonexistent" }, { name: "X" })
    expect(r.matchedCount).toBe(0)
    expect(r.modifiedCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Integration: findOneAndUpdate
// ---------------------------------------------------------------------------

describe("integration: findOneAndUpdate", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("findOneAndUpdate")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("returns before (default)", async () => {
    await seed(c, [{ _id: 1, v: 1 }])
    expect(
      ((await c.findOneAndUpdate({ _id: 1 }, { $set: { v: 2 } })) as Document)
        .v,
    ).toBe(1)
  })

  itIf("returns after with option", async () => {
    await seed(c, [{ _id: 2, v: 1 }])
    const doc = await c.findOneAndUpdate(
      { _id: 2 },
      { $set: { v: 99 } },
      { returnDocument: "after" },
    )
    expect((doc as Document).v).toBe(99)
  })

  itIf("upsert when no match", async () => {
    const doc = (await c.findOneAndUpdate(
      { name: "NewDoc" },
      { $set: { v: 42 } },
      { upsert: true, returnDocument: "after" },
    )) as Document
    expect(doc.v).toBe(42)
    expect(doc.name).toBe("NewDoc")
  })

  itIf("null when no match no upsert", async () => {
    expect(
      await c.findOneAndUpdate({ name: "Missing" }, { $set: { x: 1 } }),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Integration: findOneAndDelete
// ---------------------------------------------------------------------------

describe("integration: findOneAndDelete", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("findOneAndDelete")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("deletes and returns doc", async () => {
    await seed(c, [{ _id: "del1", name: "DeleteMe" }])
    const doc = await c.findOneAndDelete({ _id: "del1" })
    expect((doc as Document).name).toBe("DeleteMe")
    expect(await c.findOne({ _id: "del1" })).toBeNull()
  })

  itIf("null for no match", async () => {
    expect(await c.findOneAndDelete({ name: "Missing" })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Integration: findOneAndReplace
// ---------------------------------------------------------------------------

describe("integration: findOneAndReplace", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("findOneAndReplace")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("returns before (default)", async () => {
    await seed(c, [{ _id: "r1", name: "Old", v: 1 }])
    const doc = await c.findOneAndReplace({ _id: "r1" }, { name: "New", v: 2 })
    expect((doc as Document).name).toBe("Old")
    const after = (await c.findOne({ _id: "r1" })) as Document
    expect(after.name).toBe("New")
    expect(after.v).toBe(2)
  })

  itIf("returns after with option", async () => {
    await seed(c, [{ _id: "r2", name: "Before" }])
    const doc = await c.findOneAndReplace(
      { _id: "r2" },
      { name: "After" },
      { returnDocument: "after" },
    )
    expect((doc as Document).name).toBe("After")
  })

  itIf("upsert when no match", async () => {
    const doc = (await c.findOneAndReplace(
      { name: "BrandNew" },
      { name: "BrandNew", v: 7 },
      { upsert: true, returnDocument: "after" },
    )) as Document
    expect(doc.v).toBe(7)
  })

  itIf("null when no match no upsert", async () => {
    expect(
      await c.findOneAndReplace({ name: "Missing" }, { name: "X" }),
    ).toBeNull()
  })

  itIf("preserves _id", async () => {
    await seed(c, [{ _id: "keepid", name: "Orig", v: 1 }])
    await c.findOneAndReplace(
      { _id: "keepid" },
      { name: "Replaced", other: "data" },
    )
    const doc = (await c.findOne({ _id: "keepid" })) as Document
    expect(doc.name).toBe("Replaced")
    expect(doc.v).toBeUndefined()
    expect(doc._id).toBe("keepid")
  })
})

// ---------------------------------------------------------------------------
// Integration: cursor chaining
// ---------------------------------------------------------------------------

describe("integration: cursor chaining", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("cursor")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("sort skip limit project", async () => {
    await seed(c, [
      { n: "D", v: 4 },
      { n: "A", v: 1 },
      { n: "C", v: 3 },
      { n: "B", v: 2 },
    ])
    const docs = await c
      .find({})
      .sort({ v: 1 })
      .skip(1)
      .limit(2)
      .project({ n: 1 })
      .toArray()
    expect(docs).toHaveLength(2)
    expect(docs[0].n).toBe("B")
    expect(docs[0].v).toBeUndefined()
    expect(docs[1].n).toBe("C")
  })

  itIf("empty for no match", async () => {
    expect(await c.find({ missing: true }).toArray()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Integration: bulkWrite
// ---------------------------------------------------------------------------

describe("integration: bulkWrite", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("bulkWrite")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("mixed insert/update/delete", async () => {
    await seed(c, [{ _id: "existing", v: 1 }])
    const r = await c.bulkWrite([
      { insertOne: { document: { name: "New", v: 2 } } },
      {
        updateOne: { filter: { _id: "existing" }, update: { $set: { v: 99 } } },
      },
      { deleteOne: { filter: { name: "nonexistent" } } },
    ])
    expect(r.nInserted).toBe(1)
    expect(r.nMatched).toBe(1)
    expect(r.nModified).toBe(1)
    expect(r.nRemoved).toBe(0)
    expect(((await c.findOne({ _id: "existing" })) as Document).v).toBe(99)
  })

  itIf("replaceOne in bulk", async () => {
    await seed(c, [{ _id: "bwr", name: "Orig", f: "old" }])
    const r = await c.bulkWrite([
      {
        replaceOne: {
          filter: { _id: "bwr" },
          replacement: { name: "New", f: "new" },
        },
      },
    ])
    expect(r.nMatched).toBe(1)
    expect(r.nModified).toBe(1)
    const doc = (await c.findOne({ _id: "bwr" })) as Document
    expect(doc.name).toBe("New")
    expect(doc._id).toBe("bwr")
  })

  itIf("updateMany + deleteMany", async () => {
    await seed(c, [
      { g: "x", flag: false },
      { g: "x", flag: false },
      { g: "del" },
      { g: "del" },
    ])
    const r = await c.bulkWrite([
      { updateMany: { filter: { g: "x" }, update: { $set: { flag: true } } } },
      { deleteMany: { filter: { g: "del" } } },
    ])
    expect(r.nMatched).toBe(2)
    expect(r.nModified).toBe(2)
    expect(r.nRemoved).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Integration: multiple databases and collections
// ---------------------------------------------------------------------------

describe("integration: multiple databases and collections", () => {
  itIf("two databases", async () => {
    const { client: cl, db: d } = getCtx()
    const dbA = cl.db(`${d.name}_m_a`)
    const dbB = cl.db(`${d.name}_m_b`)
    const cA = dbA.collection("items")
    const cB = dbB.collection("items")
    await cA.deleteMany({})
    await cB.deleteMany({})
    await cA.insertOne({ v: "fromA" })
    await cB.insertOne({ v: "fromB" })
    expect(((await cA.findOne({})) as Document).v).toBe("fromA")
    expect(((await cB.findOne({})) as Document).v).toBe("fromB")
  })

  itIf("two collections same db", async () => {
    const d = getCtx().db
    const c1 = d.collection("dc_a")
    const c2 = d.collection("dc_b")
    await c1.deleteMany({})
    await c2.deleteMany({})
    await c1.insertOne({ d: "coll1" })
    await c2.insertOne({ d: "coll2" })
    const [r1, r2] = await Promise.all([
      c1.find({}).toArray(),
      c2.find({}).toArray(),
    ])
    expect(r1[0].d).toBe("coll1")
    expect(r2[0].d).toBe("coll2")
  })
})

// ---------------------------------------------------------------------------
// Integration: edge cases
// ---------------------------------------------------------------------------

describe("integration: edge cases", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("edgeCases")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("all data types roundtrip", async () => {
    await c.insertOne({
      str: "hello",
      num: 42,
      flt: 3.14,
      bool: true,
      nul: null,
      arr: [1, "two", false, null],
      nested: { deep: { deeper: "found" } },
    })
    const d = (await c.findOne({ str: "hello" })) as Document
    expect(d.num).toBe(42)
    expect(d.flt).toBe(3.14)
    expect(d.bool).toBe(true)
    expect(d.nul).toBeNull()
    expect(d.arr).toEqual([1, "two", false, null])
    expect(d.nested).toEqual({ deep: { deeper: "found" } })
  })

  itIf("special characters and unicode", async () => {
    await c.insertOne({
      text: "Line1\nLine2\tTabbed",
      unicode: "日本語emoji\U0001F525",
    })
    const d = (await c.findOne({
      text: "Line1\nLine2\tTabbed",
    })) as Document
    expect(d.unicode).toBe("日本語emoji\U0001F525")
  })

  itIf("long string (10k chars)", async () => {
    const long = "x".repeat(10000)
    await c.insertOne({ key: long })
    expect(((await c.findOne({})) as Document).key).toHaveLength(10000)
  })

  itIf("deeply nested (10 levels)", async () => {
    const deep: Record<string, unknown> = {}
    let ptr = deep
    for (let i = 0; i < 10; i++) {
      ptr[`l${i}`] = { val: i }
      ptr = ptr[`l${i}`] as Record<string, unknown>
    }
    await c.insertOne(deep)
    let verify = (await c.findOne({})) as Record<string, unknown>
    for (let i = 0; i < 10; i++) {
      verify = verify[`l${i}`] as Record<string, unknown>
      expect(verify.val).toBe(i)
    }
  })

  itIf("empty object", async () => {
    await c.insertOne({})
    expect(await c.findOne({})).toBeDefined()
  })

  itIf("$regex query", async () => {
    await seed(c, [{ n: "Apple" }, { n: "Banana" }, { n: "Avocado" }])
    const docs = await c.find({ n: { $regex: "^Ap" } }).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].n).toBe("Apple")
  })

  itIf("$in filter", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }])
    expect(await c.find({ v: { $in: [2, 4] } }).toArray()).toHaveLength(2)
  })

  itIf("$gt/$lt range", async () => {
    await seed(c, [{ s: 10 }, { s: 20 }, { s: 30 }, { s: 40 }])
    expect(await c.find({ s: { $gt: 15, $lt: 35 } }).toArray()).toHaveLength(2)
  })

  itIf("$or query", async () => {
    await seed(c, [{ tag: "red" }, { tag: "blue" }, { tag: "green" }])
    expect(
      await c.find({ $or: [{ tag: "red" }, { tag: "blue" }] }).toArray(),
    ).toHaveLength(2)
  })

  itIf("$exists query", async () => {
    await seed(c, [{ a: 1, b: 2 }, { a: 3 }, { b: 4 }])
    expect(await c.find({ a: { $exists: true } }).toArray()).toHaveLength(2)
  })

  itIf("$ne query", async () => {
    await seed(c, [{ s: "active" }, { s: "inactive" }, { s: "active" }])
    const docs = await c.find({ s: { $ne: "active" } }).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0].s).toBe("inactive")
  })

  itIf("default db from URI", async () => {
    const d = getCtx().client.db()
    const col = d.collection("defaultDbTest")
    await col.deleteMany({})
    await col.insertOne({ check: true })
    expect(await col.findOne({ check: true })).toBeTruthy()
  })

  itIf("throws on bad auth", async () => {
    const badUri = URI.replace(/\/\/[^@]+@/, "//wrong:auth@")
    const c2 = new MongoClient(badUri)
    const col = c2.db(getCtx().db.name).collection("badAuthTest")
    await expect(col.findOne({})).rejects.toThrow(MongojsonServerError)
  })
})

// ---------------------------------------------------------------------------
// Integration: aggregation pipeline
// ---------------------------------------------------------------------------

describe("integration: aggregate", () => {
  let c: Collection
  beforeAll(() => {
    if (isOffline()) return
    c = getCtx().db.collection("aggregate")
  })
  beforeEach(async () => {
    if (isOffline()) return
    await c.deleteMany({})
  })

  itIf("empty pipeline returns all docs", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }, { v: 3 }])
    const docs = await c.aggregate([])
    expect(docs).toHaveLength(3)
  })

  itIf("$match filters docs", async () => {
    await seed(c, [
      { status: "active", v: 1 },
      { status: "inactive", v: 2 },
      { status: "active", v: 3 },
    ])
    const docs = await c.aggregate([{ $match: { status: "active" } }])
    expect(docs).toHaveLength(2)
    for (const d of docs) expect(d.status).toBe("active")
  })

  itIf("$match with operators", async () => {
    await seed(c, [{ val: 5 }, { val: 10 }, { val: 15 }, { val: 20 }])
    const docs = await c.aggregate([{ $match: { val: { $gt: 10 } } }])
    expect(docs).toHaveLength(2)
  })

  itIf("$project includes fields", async () => {
    await seed(c, [{ a: 1, b: 2, c: 3 }])
    const docs = await c.aggregate([{ $project: { a: 1, c: 1 } }])
    expect(docs).toHaveLength(1)
    expect(docs[0].a).toBe(1)
    expect(docs[0].c).toBe(3)
    expect(docs[0].b).toBeUndefined()
  })

  itIf("$project excludes fields", async () => {
    await seed(c, [{ a: 1, b: 2, c: 3 }])
    const docs = await c.aggregate([{ $project: { b: 0 } }])
    expect(docs[0].a).toBe(1)
    expect(docs[0].c).toBe(3)
    expect(docs[0].b).toBeUndefined()
  })

  itIf("$project computed field with $concat", async () => {
    await seed(c, [{ first: "John", last: "Doe" }])
    const docs = await c.aggregate([
      { $project: { fullName: { $concat: ["$first", " ", "$last"] } } },
    ])
    expect(docs).toHaveLength(1)
    expect(docs[0].fullName).toBe("John Doe")
  })

  itIf("$sort ascending", async () => {
    await seed(c, [{ n: 3 }, { n: 1 }, { n: 2 }])
    const docs = await c.aggregate([{ $sort: { n: 1 } }])
    expect(docs.map((d) => d.n)).toEqual([1, 2, 3])
  })

  itIf("$sort descending", async () => {
    await seed(c, [{ n: 3 }, { n: 1 }, { n: 2 }])
    const docs = await c.aggregate([{ $sort: { n: -1 } }])
    expect(docs.map((d) => d.n)).toEqual([3, 2, 1])
  })

  itIf("$skip skips N docs", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }, { v: 3 }])
    const docs = await c.aggregate([{ $sort: { v: 1 } }, { $skip: 2 }])
    expect(docs).toHaveLength(1)
    expect(docs[0].v).toBe(3)
  })

  itIf("$limit limits N docs", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }, { v: 3 }])
    const docs = await c.aggregate([{ $limit: 2 }])
    expect(docs).toHaveLength(2)
  })

  itIf("$count returns single count doc", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }, { v: 3 }])
    const docs = await c.aggregate([{ $count: "total" }])
    expect(docs).toHaveLength(1)
    expect(docs[0].total).toBe(3)
  })

  itIf("$count uses default field name", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }])
    const docs = await c.aggregate([{ $count: "count" }])
    expect(docs[0].count).toBe(2)
  })

  itIf("$group with $sum", async () => {
    await seed(c, [
      { cat: "a", val: 10 },
      { cat: "a", val: 20 },
      { cat: "b", val: 30 },
    ])
    const docs = await c.aggregate([
      { $group: { _id: "$cat", total: { $sum: "$val" } } },
    ])
    expect(docs).toHaveLength(2)
    const a = docs.find((d) => d._id === "a") as Document
    const b = docs.find((d) => d._id === "b") as Document
    expect(a.total).toBe(30)
    expect(b.total).toBe(30)
  })

  itIf("$group with $sum (constant)", async () => {
    await seed(c, [{ cat: "a" }, { cat: "a" }, { cat: "b" }])
    const docs = await c.aggregate([
      { $group: { _id: "$cat", count: { $sum: 1 } } },
    ])
    const a = docs.find((d) => d._id === "a") as Document
    const b = docs.find((d) => d._id === "b") as Document
    expect(a.count).toBe(2)
    expect(b.count).toBe(1)
  })

  itIf("$group with $avg", async () => {
    await seed(c, [
      { g: "x", v: 10 },
      { g: "x", v: 20 },
      { g: "y", v: 30 },
    ])
    const docs = await c.aggregate([
      { $group: { _id: "$g", avgVal: { $avg: "$v" } } },
    ])
    const x = docs.find((d) => d._id === "x") as Document
    expect(x.avgVal).toBe(15)
  })

  itIf("$group with $push", async () => {
    await seed(c, [
      { g: "x", n: "a" },
      { g: "x", n: "b" },
      { g: "y", n: "c" },
    ])
    const docs = await c.aggregate([
      { $group: { _id: "$g", items: { $push: "$n" } } },
    ])
    const x = docs.find((d) => d._id === "x") as Document
    expect(x.items).toEqual(["a", "b"])
  })

  itIf("$group with $addToSet", async () => {
    await seed(c, [
      { g: "x", n: "a" },
      { g: "x", n: "a" },
      { g: "x", n: "b" },
    ])
    const docs = await c.aggregate([
      { $group: { _id: "$g", uniq: { $addToSet: "$n" } } },
    ])
    const x = docs.find((d) => d._id === "x") as Document
    expect(x.uniq).toHaveLength(2)
    expect(x.uniq).toContain("a")
    expect(x.uniq).toContain("b")
  })

  itIf("$group with $min/$max", async () => {
    await seed(c, [
      { g: "x", v: 5 },
      { g: "x", v: 15 },
      { g: "x", v: 10 },
    ])
    const docs = await c.aggregate([
      { $group: { _id: "$g", minV: { $min: "$v" }, maxV: { $max: "$v" } } },
    ])
    const x = docs.find((d) => d._id === "x") as Document
    expect(x.minV).toBe(5)
    expect(x.maxV).toBe(15)
  })

  itIf("$group with $first/$last", async () => {
    await seed(c, [
      { g: "x", seq: 1 },
      { g: "x", seq: 2 },
      { g: "x", seq: 3 },
    ])
    const docs = await c.aggregate([
      { $sort: { seq: 1 } },
      { $group: { _id: "$g", first: { $first: "$seq" }, last: { $last: "$seq" } } },
    ])
    const x = docs.find((d) => d._id === "x") as Document
    expect(x.first).toBe(1)
    expect(x.last).toBe(3)
  })

  itIf("$group compound _id", async () => {
    await seed(c, [
      { cat: "a", status: "ok", v: 1 },
      { cat: "a", status: "ok", v: 2 },
      { cat: "a", status: "fail", v: 3 },
      { cat: "b", status: "ok", v: 4 },
    ])
    const docs = await c.aggregate([
      { $group: { _id: { category: "$cat", status: "$status" }, total: { $sum: "$v" } } },
    ])
    expect(docs).toHaveLength(3)
  })

  itIf("$unwind array field (string syntax)", async () => {
    await seed(c, [{ _id: 1, items: ["a", "b", "c"] }])
    const docs = await c.aggregate([{ $unwind: "$items" }])
    expect(docs).toHaveLength(3)
    expect(docs[0].items).toBe("a")
    expect(docs[1].items).toBe("b")
    expect(docs[2].items).toBe("c")
  })

  itIf("$unwind array field (object syntax)", async () => {
    await seed(c, [{ _id: 1, tags: ["x", "y"] }])
    const docs = await c.aggregate([{ $unwind: { path: "$tags" } }])
    expect(docs).toHaveLength(2)
    expect(docs[0].tags).toBe("x")
    expect(docs[1].tags).toBe("y")
  })

  itIf("$unwind non-array keeps doc", async () => {
    await seed(c, [{ _id: 1, val: "not-array" }])
    const docs = await c.aggregate([{ $unwind: "$val" }])
    expect(docs).toHaveLength(1)
    expect(docs[0].val).toBe("not-array")
  })

  itIf("$addFields with $add arithmetic", async () => {
    await seed(c, [{ a: 10, b: 20 }])
    const docs = await c.aggregate([{ $addFields: { sum: { $add: ["$a", "$b"] } } }])
    expect(docs[0].a).toBe(10)
    expect(docs[0].b).toBe(20)
    expect(docs[0].sum).toBe(30)
  })

  itIf("$addFields field reference", async () => {
    await seed(c, [{ a: 10, b: 20 }])
    const docs = await c.aggregate([{ $addFields: { c: "$a" } }])
    expect(docs[0].a).toBe(10)
    expect(docs[0].c).toBe(10)
  })

  itIf("$set aliases $addFields", async () => {
    await seed(c, [{ name: "alice" }])
    const docs = await c.aggregate([{ $set: { greeting: "$name" } }])
    expect(docs[0].greeting).toBe("alice")
  })

  itIf("pipeline chains: $match → $sort → $skip → $limit", async () => {
    await seed(c, [
      { s: "a", v: 5 },
      { s: "b", v: 2 },
      { s: "b", v: 3 },
      { s: "b", v: 1 },
      { s: "a", v: 4 },
    ])
    const docs = await c.aggregate([
      { $match: { s: "b" } },
      { $sort: { v: 1 } },
      { $skip: 1 },
      { $limit: 1 },
    ])
    expect(docs).toHaveLength(1)
    expect(docs[0].v).toBe(2)
  })

  itIf("pipeline chains: $group → $sort → $project", async () => {
    await seed(c, [
      { cat: "x", val: 5 },
      { cat: "x", val: 15 },
      { cat: "y", val: 10 },
    ])
    const docs = await c.aggregate([
      { $group: { _id: "$cat", total: { $sum: "$val" } } },
      { $sort: { total: -1 } },
      { $project: { total: 1 } },
    ])
    expect(docs).toHaveLength(2)
    expect(docs[0].total).toBe(20)
    expect(docs[0]._id).toBe("x")
    expect(docs[1].total).toBe(10)
    expect(docs[1]._id).toBe("y")
  })

  itIf("pipeline: $match → $unwind → $group → $count", async () => {
    await seed(c, [
      { _id: 1, tags: ["a", "b"] },
      { _id: 2, tags: ["a"] },
      { _id: 3, tags: ["b", "c"] },
    ])
    const docs = await c.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $count: "tagCount" },
    ])
    expect(docs[0].tagCount).toBe(3) // 3 groups after $group
  })

  itIf("aggregate returns empty for no match", async () => {
    await seed(c, [{ v: 1 }])
    const docs = await c.aggregate([{ $match: { v: 999 } }])
    expect(docs).toHaveLength(0)
  })

  itIf("aggregate with no pipeline returns all", async () => {
    await seed(c, [{ v: 1 }, { v: 2 }])
    const docs = await c.aggregate([])
    expect(docs).toHaveLength(2)
  })

  itIf("$replaceRoot promotes sub-doc", async () => {
    await seed(c, [{ _id: 1, nested: { a: 1, b: 2 } }])
    const docs = await c.aggregate([
      { $replaceRoot: { newRoot: "$nested" } },
    ])
    expect(docs).toHaveLength(1)
    expect(docs[0].a).toBe(1)
    expect(docs[0].b).toBe(2)
    expect(docs[0]._id).toBeUndefined()
  })

  itIf("$replaceWith field ref", async () => {
    await seed(c, [{ _id: 1, data: { x: 10 } }])
    const docs = await c.aggregate([{ $replaceWith: "$data" }])
    expect(docs[0].x).toBe(10)
    expect(docs[0]._id).toBeUndefined()
  })

  itIf("$sortByCount groups and sorts descending", async () => {
    await seed(c, [
      { cat: "a" },
      { cat: "b" },
      { cat: "a" },
      { cat: "c" },
      { cat: "a" },
    ])
    const docs = await c.aggregate([{ $sortByCount: "$cat" }])
    expect(docs).toHaveLength(3)
    expect(docs[0]._id).toBe("a")
    expect(docs[0].count).toBe(3)
    expect(docs[1]._id).toBe("b")
    expect(docs[1].count).toBe(1)
    expect(docs[2]._id).toBe("c")
    expect(docs[2].count).toBe(1)
  })

  itIf("$sample returns N random docs", async () => {
    await seed(c, [
      { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 },
    ])
    const docs = await c.aggregate([{ $sample: { size: 3 } }])
    expect(docs).toHaveLength(3)
  })

  itIf("$lookup joins across collections", async () => {
    const ctx = getCtx()
    const orders = ctx.db.collection("agg_orders")
    const products = ctx.db.collection("agg_products")
    await orders.deleteMany({})
    await products.deleteMany({})
    await orders.insertMany([
      { _id: 1, product: "p1", qty: 2 },
      { _id: 2, product: "p2", qty: 1 },
    ])
    await products.insertMany([
      { _id: "p1", name: "Widget", price: 10 },
      { _id: "p2", name: "Gadget", price: 20 },
      { _id: "p3", name: "Extra", price: 5 },
    ])
    const docs = await orders.aggregate([
      {
        $lookup: {
          from: "agg_products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
    ])
    expect(docs).toHaveLength(2)
    const d0 = docs[0] as Document
    const d1 = docs[1] as Document
    expect(d0.productInfo).toHaveLength(1)
    expect((d0.productInfo as Document[])[0].name).toBe("Widget")
    expect(d1.productInfo).toHaveLength(1)
    expect((d1.productInfo as Document[])[0].name).toBe("Gadget")
  })

  itIf("$lookup empty match returns empty array", async () => {
    const ctx = getCtx()
    const col = ctx.db.collection("agg_lookup_empty")
    await col.deleteMany({})
    await ctx.db.collection("agg_lookup_target").deleteMany({})
    await col.insertOne({ _id: 1, refId: "nonexistent" })
    await ctx.db.collection("agg_lookup_target").insertOne({ _id: "exists" })
    const docs = await col.aggregate([
      {
        $lookup: {
          from: "agg_lookup_target",
          localField: "refId",
          foreignField: "_id",
          as: "matches",
        },
      },
    ])
    expect(docs[0].matches).toEqual([])
  })

  itIf("$lookup with pipeline+let syntax", async () => {
    const ctx = getCtx()
    const orders = ctx.db.collection("lkp_pipeline_orders")
    const products = ctx.db.collection("lkp_pipeline_products")
    await orders.deleteMany({})
    await products.deleteMany({})
    await orders.insertMany([
      { _id: 1, productId: "p1", qty: 2 },
      { _id: 2, productId: "p2", qty: 1 },
    ])
    await products.insertMany([
      { _id: "p1", name: "Widget", price: 10 },
      { _id: "p2", name: "Gadget", price: 20 },
      { _id: "p3", name: "Extra", price: 5 },
    ])
    const docs = await orders.aggregate([
      {
        $lookup: {
          from: "lkp_pipeline_products",
          let: { pid: "$productId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
          ],
          as: "productInfo",
        },
      },
    ])
    expect(docs).toHaveLength(2)
    expect((docs[0] as Document).productInfo).toHaveLength(1)
    expect(((docs[0] as Document).productInfo as Document[])[0].name).toBe("Widget")
    expect((docs[1] as Document).productInfo).toHaveLength(1)
    expect(((docs[1] as Document).productInfo as Document[])[0].name).toBe("Gadget")
  })

  itIf("$lookup pipeline with multiple stages", async () => {
    const ctx = getCtx()
    const authors = ctx.db.collection("lkp_authors")
    const posts = ctx.db.collection("lkp_posts")
    await authors.deleteMany({})
    await posts.deleteMany({})
    await authors.insertMany([
      { _id: "a1", name: "Alice" },
      { _id: "a2", name: "Bob" },
    ])
    await posts.insertMany([
      { authorId: "a1", title: "Post 1", stars: 5 },
      { authorId: "a1", title: "Post 2", stars: 3 },
      { authorId: "a2", title: "Post 3", stars: 4 },
      { authorId: "a2", title: "Post 4", stars: 2 },
    ])
    const docs = await authors.aggregate([
      {
        $lookup: {
          from: "lkp_posts",
          let: { aid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$authorId", "$$aid"] } } },
            { $sort: { stars: -1 } },
            { $limit: 1 },
            { $project: { title: 1, stars: 1, _id: 0 } },
          ],
          as: "topPost",
        },
      },
    ])
    expect(docs).toHaveLength(2)
    const alice = docs.find((d) => d.name === "Alice") as Document
    const bob = docs.find((d) => d.name === "Bob") as Document
    expect(alice.topPost).toHaveLength(1)
    expect((alice.topPost as Document[])[0].title).toBe("Post 1")
    expect((alice.topPost as Document[])[0].stars).toBe(5)
    expect(bob.topPost).toHaveLength(1)
    expect((bob.topPost as Document[])[0].title).toBe("Post 3")
    expect((bob.topPost as Document[])[0].stars).toBe(4)
  })

  itIf("$lookup pipeline empty result", async () => {
    const ctx = getCtx()
    const col = ctx.db.collection("lkp_pipe_empty_main")
    const target = ctx.db.collection("lkp_pipe_empty_target")
    await col.deleteMany({})
    await target.deleteMany({})
    await col.insertOne({ _id: 1, ref: "missing" })
    await target.insertOne({ _id: "exists" })
    const docs = await col.aggregate([
      {
        $lookup: {
          from: "lkp_pipe_empty_target",
          let: { r: "$ref" },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$r"] } } }],
          as: "matches",
        },
      },
    ])
    expect(docs[0].matches).toEqual([])
  })

  // -----------------------------------------------------------------------
  // Expression operator tests
  // -----------------------------------------------------------------------

  itIf("$toUpper expression", async () => {
    await seed(c, [{ name: "hello" }])
    const docs = await c.aggregate([
      { $project: { upper: { $toUpper: "$name" } } },
    ])
    expect(docs[0].upper).toBe("HELLO")
  })

  itIf("$toLower expression", async () => {
    await seed(c, [{ name: "WORLD" }])
    const docs = await c.aggregate([
      { $project: { lower: { $toLower: "$name" } } },
    ])
    expect(docs[0].lower).toBe("world")
  })

  itIf("$substr expression", async () => {
    await seed(c, [{ text: "hello world" }])
    const docs = await c.aggregate([
      { $project: { sub: { $substr: ["$text", 0, 5] } } },
    ])
    expect(docs[0].sub).toBe("hello")
  })

  itIf("$add expression", async () => {
    await seed(c, [{ a: 5, b: 10, c: 15 }])
    const docs = await c.aggregate([
      { $project: { total: { $add: ["$a", "$b", "$c"] } } },
    ])
    expect(docs[0].total).toBe(30)
  })

  itIf("$subtract expression", async () => {
    await seed(c, [{ a: 20, b: 8 }])
    const docs = await c.aggregate([
      { $project: { diff: { $subtract: ["$a", "$b"] } } },
    ])
    expect(docs[0].diff).toBe(12)
  })

  itIf("$multiply expression", async () => {
    await seed(c, [{ a: 4, b: 5 }])
    const docs = await c.aggregate([
      { $project: { prod: { $multiply: ["$a", "$b"] } } },
    ])
    expect(docs[0].prod).toBe(20)
  })

  itIf("$divide expression", async () => {
    await seed(c, [{ a: 10, b: 3 }])
    const docs = await c.aggregate([
      { $project: { quot: { $divide: ["$a", "$b"] } } },
    ])
    expect(docs[0].quot).toBeCloseTo(3.333, 2)
  })

  itIf("$mod expression", async () => {
    await seed(c, [{ a: 10, b: 3 }])
    const docs = await c.aggregate([
      { $project: { rem: { $mod: ["$a", "$b"] } } },
    ])
    expect(docs[0].rem).toBe(1)
  })

  itIf("$round expression", async () => {
    await seed(c, [{ v: 3.7 }])
    const docs = await c.aggregate([{ $project: { r: { $round: "$v" } } }])
    expect(docs[0].r).toBe(4)
  })

  itIf("$ceil and $floor", async () => {
    await seed(c, [{ v: 3.3 }])
    const docs = await c.aggregate([
      { $project: { c: { $ceil: "$v" }, f: { $floor: "$v" } } },
    ])
    expect(docs[0].c).toBe(4)
    expect(docs[0].f).toBe(3)
  })

  itIf("$abs expression", async () => {
    await seed(c, [{ v: -7 }])
    const docs = await c.aggregate([{ $project: { a: { $abs: "$v" } } }])
    expect(docs[0].a).toBe(7)
  })

  itIf("$cond (array syntax)", async () => {
    await seed(c, [{ qty: 10 }])
    const docs = await c.aggregate([
      {
        $project: {
          size: {
            $cond: [{ $gte: ["$qty", 5] }, "big", "small"],
          },
        },
      },
    ])
    expect(docs[0].size).toBe("big")
  })

  itIf("$cond (object syntax)", async () => {
    await seed(c, [{ score: 2 }])
    const docs = await c.aggregate([
      {
        $project: {
          pass: {
            $cond: { if: { $gte: ["$score", 5] }, then: "pass", else: "fail" },
          },
        },
      },
    ])
    expect(docs[0].pass).toBe("fail")
  })

  itIf("$ifNull returns default for null", async () => {
    await seed(c, [{ a: null }])
    const docs = await c.aggregate([
      { $project: { val: { $ifNull: ["$a", "default"] } } },
    ])
    expect(docs[0].val).toBe("default")
  })

  itIf("$ifNull passes through value", async () => {
    await seed(c, [{ a: 42 }])
    const docs = await c.aggregate([
      { $project: { val: { $ifNull: ["$a", "default"] } } },
    ])
    expect(docs[0].val).toBe(42)
  })

  itIf("$size expression", async () => {
    await seed(c, [{ items: ["a", "b", "c"] }])
    const docs = await c.aggregate([{ $project: { sz: { $size: "$items" } } }])
    expect(docs[0].sz).toBe(3)
  })

  itIf("$gt/$lt in $match (via $expr)", async () => {
    // $match doesn't evaluate expressions — test $gt inside $project
    await seed(c, [{ a: 5, b: 10 }])
    const docs = await c.aggregate([
      { $project: { gt: { $gt: ["$a", "$b"] }, lt: { $lt: ["$a", "$b"] } } },
    ])
    expect(docs[0].gt).toBe(false)
    expect(docs[0].lt).toBe(true)
  })

  itIf("$eq/$ne in $project", async () => {
    await seed(c, [{ x: 1, y: 1, z: 2 }])
    const docs = await c.aggregate([
      { $project: { eq: { $eq: ["$x", "$y"] }, ne: { $ne: ["$x", "$z"] } } },
    ])
    expect(docs[0].eq).toBe(true)
    expect(docs[0].ne).toBe(true)
  })

  itIf("$and/$or/$not logical", async () => {
    await seed(c, [{ a: true, b: false }])
    const docs = await c.aggregate([
      {
        $project: {
          and: { $and: ["$a", "$b"] },
          or: { $or: ["$a", "$b"] },
          not: { $not: "$b" },
        },
      },
    ])
    expect(docs[0].and).toBe(false)
    expect(docs[0].or).toBe(true)
    expect(docs[0].not).toBe(true)
  })

  itIf("$dateToString format date", async () => {
    await seed(c, [{ dt: "2024-03-15T10:30:00Z" }])
    const docs = await c.aggregate([
      {
        $project: {
          formatted: {
            $dateToString: { date: "$dt", format: "%Y-%m-%d" },
          },
        },
      },
    ])
    expect(docs[0].formatted).toBe("2024-03-15")
  })

  itIf("$year/$month/$dayOfMonth extractors", async () => {
    await seed(c, [{ dt: "2024-03-15T10:30:00Z" }])
    const docs = await c.aggregate([
      {
        $project: {
          y: { $year: "$dt" },
          m: { $month: "$dt" },
          d: { $dayOfMonth: "$dt" },
        },
      },
    ])
    expect(docs[0].y).toBe(2024)
    expect(docs[0].m).toBe(3)
    expect(docs[0].d).toBe(15)
  })

  itIf("$toString/$toInt type conversion", async () => {
    await seed(c, [{ n: 42, s: "99" }])
    const docs = await c.aggregate([
      {
        $project: {
          str: { $toString: "$n" },
          num: { $toInt: "$s" },
        },
      },
    ])
    expect(docs[0].str).toBe("42")
    expect(docs[0].num).toBe(99)
  })

  itIf("$switch expression", async () => {
    await seed(c, [{ score: 85 }])
    const docs = await c.aggregate([
      {
        $project: {
          grade: {
            $switch: {
              branches: [
                { case: { $gte: ["$score", 90] }, then: "A" },
                { case: { $gte: ["$score", 80] }, then: "B" },
                { case: { $gte: ["$score", 70] }, then: "C" },
              ],
              default: "F",
            },
          },
        },
      },
    ])
    expect(docs[0].grade).toBe("B")
  })

  itIf("$arrayElemAt and $slice", async () => {
    await seed(c, [{ arr: [10, 20, 30, 40] }])
    const docs = await c.aggregate([
      {
        $project: {
          first: { $arrayElemAt: ["$arr", 0] },
          last: { $arrayElemAt: ["$arr", -1] },
          slice: { $slice: ["$arr", 1, 2] },
        },
      },
    ])
    expect(docs[0].first).toBe(10)
    expect(docs[0].last).toBe(40)
    expect(docs[0].slice).toEqual([20, 30])
  })

  itIf("$in checks value in array", async () => {
    await seed(c, [{ tags: ["a", "b", "c"], search: "b" }])
    const docs = await c.aggregate([
      { $project: { found: { $in: ["$search", "$tags"] } } },
    ])
    expect(docs[0].found).toBe(true)
  })

  itIf("$trim whitespace", async () => {
    await seed(c, [{ text: "  hello  " }])
    const docs = await c.aggregate([
      { $project: { t: { $trim: "$text" }, l: { $ltrim: "$text" }, r: { $rtrim: "$text" } } },
    ])
    expect(docs[0].t).toBe("hello")
    expect(docs[0].l).toBe("hello  ")
    expect(docs[0].r).toBe("  hello")
  })

  itIf("$pow and $sqrt", async () => {
    await seed(c, [{ base: 3, exp: 4, val: 9 }])
    const docs = await c.aggregate([
      {
        $project: {
          pow: { $pow: ["$base", "$exp"] },
          sqrt: { $sqrt: "$val" },
        },
      },
    ])
    expect(docs[0].pow).toBe(81)
    expect(docs[0].sqrt).toBe(3)
  })

  itIf("nested expressions", async () => {
    await seed(c, [{ price: 120, qty: 3, discount: 10 }])
    const docs = await c.aggregate([
      {
        $project: {
          total: {
            $cond: {
              if: { $gte: ["$qty", 5] },
              then: { $multiply: ["$price", "$qty"] },
              else: {
                $subtract: [
                  { $multiply: ["$price", "$qty"] },
                  "$discount",
                ],
              },
            },
          },
        },
      },
    ])
    expect(docs[0].total).toBe(350) // 120*3 - 10
  })
})

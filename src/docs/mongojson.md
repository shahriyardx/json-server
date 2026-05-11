---
title: MongoJSON SDK
slug: mongojson
order: 7
---

# MongoJSON SDK

MongoJSON is a MongoDB-compatible SDK for JSON Server. Use the same `MongoClient`, `Collection`, and query syntax you know — it maps to REST endpoints under the hood.

## Installation

```bash
npm install mongojson
# or
bun add mongojson
```

## Quick Start

```typescript
import { MongoClient } from "mongojson"

const uri = "mongodb://<dbuser>:<dbpass>@yourusername.json.shahriyar.dev/mydb"
const client = new MongoClient(uri)
await client.connect()

const db = client.db()
const users = db.collection("users")

// Create
await users.insertOne({ name: "Alice", age: 30 })

// Read
const all = await users.find().toArray()
const adult = await users.findOne({ age: { $gte: 18 } })

// Update
await users.updateOne({ name: "Alice" }, { $set: { age: 31 } })

// Delete
await users.deleteOne({ name: "Alice" })

// Count
const total = await users.countDocuments()
```

## Connection URI

```
mongodb://<dbuser>:<dbpass>@<username>.<domain>[:port]/<database>
```

| Part | Description |
|------|-------------|
| `dbuser:dbpass` | Database user credentials (create in Dashboard → MongoDB → Authentication) |
| `username` | Your platform username (subdomain) |
| `domain` | Server domain — `json.shahriyar.dev` or `localhost` for local dev |
| `port` | Optional (e.g. `3000` for local dev) |
| `database` | Default database name (used by `client.db()` with no args) |

## Collection Operations

### Create

```typescript
// Single document
const { insertedId } = await collection.insertOne({ name: "Jane", age: 25 })

// Multiple documents
const { insertedIds } = await collection.insertMany([
  { name: "Bob" },
  { name: "Alice" },
])
```

### Read

```typescript
// All documents
const docs = await collection.find({}).toArray()

// With filter, sort, limit
const results = await collection
  .find({ age: { $gt: 20 } })
  .sort({ age: -1 })
  .limit(10)
  .skip(5)
  .project({ name: 1 })
  .toArray()

// Single document
const user = await collection.findOne({ name: "Jane" })

// By ID
const user = await collection.findById("user_123")
```

### Update

```typescript
// Update first match
const { matchedCount, modifiedCount } = await collection.updateOne(
  { name: "Jane" },
  { $set: { age: 26 } },
)

// Update all matches
await collection.updateMany(
  { role: "guest" },
  { $set: { role: "user" } },
)

// Upsert (insert if not found)
await collection.updateOne(
  { name: "NewUser" },
  { $set: { age: 20 } },
  { upsert: true },
)
```

### Delete

```typescript
const { deletedCount } = await collection.deleteOne({ name: "Bob" })
const { deletedCount } = await collection.deleteMany({ status: "inactive" })
```

### Replace

```typescript
const { modifiedCount } = await collection.replaceOne(
  { name: "Jane" },
  { name: "Janet", age: 27 },
)
```

### Count

```typescript
const total = await collection.countDocuments()
const filtered = await collection.countDocuments({ role: "admin" })
const estimated = await collection.estimatedDocumentCount()
```

### Distinct

```typescript
const values = await collection.distinct("category")
const filtered = await collection.distinct("category", { active: true })
```

### Atomic Find-and-Modify

```typescript
// Find and update (returns document before update by default)
const old = await collection.findOneAndUpdate(
  { _id: 1 },
  { $set: { status: "processed" } },
)

// Find and delete
const deleted = await collection.findOneAndDelete({ _id: 1 })

// Find and replace
const replaced = await collection.findOneAndReplace(
  { _id: 1 },
  { name: "New", v: 2 },
)

// With options
const updated = await collection.findOneAndUpdate(
  { _id: 1 },
  { $set: { v: 99 } },
  { returnDocument: "after", upsert: true },
)
```

### Bulk Write

```typescript
const result = await collection.bulkWrite([
  { insertOne: { document: { name: "New", v: 2 } } },
  { updateOne: { filter: { _id: "existing" }, update: { $set: { v: 99 } } } },
  { deleteOne: { filter: { name: "old" } } },
  { updateMany: { filter: { status: "pending" }, update: { $set: { status: "done" } } } },
  { deleteMany: { filter: { expired: true } } },
])
```

## Filter Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `$eq` | `{ age: { $eq: 25 } }` | Equal (also plain value) |
| `$ne` | `{ age: { $ne: 25 } }` | Not equal |
| `$gt` | `{ age: { $gt: 18 } }` | Greater than |
| `$gte` | `{ age: { $gte: 18 } }` | Greater than or equal |
| `$lt` | `{ age: { $lt: 18 } }` | Less than |
| `$lte` | `{ age: { $lte: 18 } }` | Less than or equal |
| `$in` | `{ age: { $in: [18, 21] } }` | In array |
| `$nin` | `{ age: { $nin: [18, 21] } }` | Not in array |
| `$exists` | `{ email: { $exists: true } }` | Field exists |
| `$regex` | `{ name: { $regex: "^A" } }` | Pattern match |
| `$or` | `{ $or: [{ status: "a" }, { status: "b" }] }` | Logical OR |
| `$and` | `{ $and: [{ age: { $gt: 18 } }, { status: "active" }] }` | Logical AND |
| `$nor` | `{ $nor: [{ status: "deleted" }] }` | Logical NOR |

## Update Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `$set` | `{ $set: { name: "New" } }` | Set field value |
| `$unset` | `{ $unset: { tmp: "" } }` | Remove field |
| `$inc` | `{ $inc: { count: 1 } }` | Increment (negative to decrement) |
| `$mul` | `{ $mul: { price: 1.1 } }` | Multiply |
| `$min` | `{ $min: { score: 100 } }` | Set if lower |
| `$max` | `{ $max: { score: 100 } }` | Set if higher |
| `$rename` | `{ $rename: { oldName: "newName" } }` | Rename field |
| `$push` | `{ $push: { items: "new" } }` | Append to array |
| `$addToSet` | `{ $addToSet: { tags: "unique" } }` | Add unique to array |
| `$pull` | `{ $pull: { items: "value" } }` | Remove from array |

## Drop-in Replacement

MongoJSON accepts the same `MongoClientOptions` as the official MongoDB driver (as no-ops), so you can swap it in without TypeScript errors:

```typescript
import { MongoClient, ServerApiVersion } from "mongojson"

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
  },
  connectTimeoutMS: 5000,
  maxPoolSize: 10,
})
```

## Error Handling

```typescript
import { MongojsonServerError, MongojsonBulkWriteError } from "mongojson"

try {
  await collection.insertOne({ _id: 1 })
} catch (err) {
  if (err instanceof MongojsonServerError) {
    console.log(err.status, err.code, err.errmsg)
    // e.g. 409, 11000, "E11000 duplicate key error"
  }
}
```

Errors include MongoDB-style `code` and `codeName`:

| HTTP Status | Code | codeName |
|-------------|------|----------|
| 401 | 8000 | `MongojsonError` |
| 403 | 13 | `Unauthorized` |
| 404 | 26 | `NamespaceNotFound` |
| 409 | 11000 | `DuplicateKey` |
| 422 | 2 | `BadValue` |
| Other | 0 | `UnknownError` |

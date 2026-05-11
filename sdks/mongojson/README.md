# mongodx

MongoDB-compatible SDK for json-server. Use MongoDB-like operations on top of a REST API.

```ts
import { MongoClient } from "mongodx"

// API key auth:
const client = new MongoClient("mongodb://sk_xxx@shahriyardx.json.shahriyar.dev/mydb")

// Database user auth:
// const client = new MongoClient("mongodb://dbuser:dbpass@shahriyardx.json.shahriyar.dev/mydb")

// Local dev:
// const client = new MongoClient("mongodb://sk_xxx@shahriyardx.localhost:3000/playground")

const db = client.db() // uses "mydb" from URI path
const users = db.collection("users")

// Read
const all = await users.find().toArray()
const adults = await users.find({ age: { $gte: 18 } }).toArray()
const john = await users.findOne({ name: "John" })

// Create
await users.insertOne({ name: "Jane", age: 25 })
await users.insertMany([{ name: "Bob" }, { name: "Alice" }])

// Update
await users.updateOne({ name: "Jane" }, { $set: { age: 26 } })
await users.updateMany({ age: { $lt: 18 } }, { $set: { status: "minor" } })

// Delete
await users.deleteOne({ name: "Bob" })
await users.deleteMany({ status: "inactive" })

// Count
const total = await users.countDocuments()
const filtered = await users.countDocuments({ role: "admin" })

// Replace
await users.replaceOne({ name: "Jane" }, { name: "Janet", age: 27 })

// With options (chainable cursor)
const results = await users
  .find({ age: { $gt: 20 } })
  .sort({ age: -1 })
  .limit(10)
  .skip(5)
  .project({ name: 1, age: 1 })
  .toArray()
```

## URI format

```
mongodb://[auth]@[username].[domain][:port]/[database]
```

| Part | Description |
|------|-------------|
| `auth` | API key (starts with `sk_`) or `user:password` for Basic auth |
| `username` | Your platform username (subdomain) |
| `domain` | Server domain (e.g. `json.shahriyar.dev`) |
| `port` | Optional port |
| `database` | Default database name |

## API

`client.db(name?)` — get or auto-create a database. Uses URI path as default name.

`db.collection(name)` — get or auto-create a collection. Returns `Collection`.

### Collection methods

| Method | Returns | Description |
|--------|---------|-------------|
| `.find(filter?, options?)` | `Document[]` | Query documents |
| `.findOne(filter, options?)` | `Document \| null` | First matching document |
| `.insertOne(doc)` | `{ insertedId }` | Insert single document |
| `.insertMany(docs)` | `{ insertedIds }` | Insert multiple documents |
| `.updateOne(filter, update)` | `{ matchedCount, modifiedCount }` | Update first match |
| `.updateMany(filter, update)` | `{ matchedCount, modifiedCount }` | Update all matches |
| `.deleteOne(filter)` | `{ deletedCount }` | Delete first match |
| `.deleteMany(filter)` | `{ deletedCount }` | Delete all matches |
| `.countDocuments(filter?)` | `number` | Count matching documents |
| `.replaceOne(filter, doc)` | `{ matchedCount, modifiedCount }` | Full replacement |

### Filter operators

`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$type`, `$regex`, `$mod`, `$all`, `$size`, `$elemMatch`, `$not`, `$and`, `$or`, `$nor`

### Update operators

`$set`, `$unset`, `$inc`, `$mul`, `$min`, `$max`, `$rename`, `$currentDate`, `$push` (with `$each`/`$slice`/`$sort`), `$addToSet`, `$pull`

### Find options

`sort`, `limit`, `skip`, `projection`

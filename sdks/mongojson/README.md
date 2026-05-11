# mongojson

MongoDB-compatible SDK for [JSON Server](https://json.shahriyar.dev). Use MongoDB-like operations on top of a REST API.

```ts
import { MongoClient } from "mongojson"

const uri = "mongodb://dbuser:dbpass@yourusername.json.shahriyar.dev/mydb"
const client = new MongoClient(uri)
await client.connect()

const db = client.db()
const users = db.collection("users")

// Create
await users.insertOne({ name: "Alice", age: 30 })

// Read
const all = await users.find().toArray()
const alice = await users.findOne({ name: "Alice" })

// Update
await users.updateOne({ name: "Alice" }, { $set: { age: 31 } })

// Delete
await users.deleteOne({ name: "Alice" })

// Count
const total = await users.countDocuments()
```

## Installation

```bash
npm install mongojson
```

## Documentation

Full documentation including all operations, filter operators, update operators, error handling, and connection URI format is available at:

**[https://json.shahriyar.dev/docs/mongojson](https://json.shahriyar.dev/docs/mongojson)**

## License

MIT

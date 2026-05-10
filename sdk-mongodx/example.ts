import { MongoClient } from "./src/index"

const URI =
  process.env.URI ?? "mongodb://admin:pass@shahriyardx.json.shahriyar.dev/test"

async function main() {
  const client = new MongoClient(URI)
  await client.connect()

  const db = client.db() // uses default DB from URI path
  const col = db.collection("users")
  await col.insertOne({
    name: "Alice",
    age: 10,
  })
  const distinctNames = await col.distinct("name")
  console.log("Distinct names:", distinctNames)
}

main().catch(console.error)

import "dotenv/config"
import { randomBytes } from "node:crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const users = [
  { name: "Alice Admin", username: "alice", email: "alice@test.com", role: "admin" },
  { name: "Bob Builder", username: "bob", email: "bob@test.com", role: "user" },
  { name: "Charlie", username: "charlie", email: "charlie@test.com", role: "user" },
  { name: "Diana Dev", username: "diana", email: "diana@test.com", role: "user" },
  { name: "Eve Editor", username: "eve", email: "eve@test.com", role: "admin" },
]

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: randomBytes(16).toString("hex"),
        name: u.name,
        username: u.username,
        email: u.email,
        emailVerified: false,
        role: u.role,
      },
    })
  }
  console.log(`Seeded ${users.length} fake users`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

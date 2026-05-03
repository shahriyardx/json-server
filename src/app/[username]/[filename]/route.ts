import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string; filename: string }> },
) {
  const { username, filename } = await params

  const user = await prisma.user.findFirst({ where: { username } })
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const jsonFile = await prisma.jsonFile.findUnique({
    where: { userId_filename: { userId: user.id, filename } },
  })
  if (!jsonFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let content: unknown
  try {
    content = JSON.parse(jsonFile.content)
  } catch {
    content = jsonFile.content
  }

  return NextResponse.json(content)
}

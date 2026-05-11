import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { corsHeaders } from "@/lib/api/response"
import { applyMongoFilter } from "@/lib/api/mongo-filter"
import type { ParsedDoc } from "./types"

export function mongoJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

// Load all docs in a collection, parse data JSON, return with __prismaId
export async function loadParsedDocs(
  collectionId: string,
): Promise<ParsedDoc[]> {
  const records = await prisma.document.findMany({
    where: { collectionId },
    orderBy: { createdAt: "asc" },
  })
  return records.map((r) => {
    const parsed = JSON.parse(r.data) as ParsedDoc
    parsed.__prismaId = r.id
    return parsed
  })
}

// Ensure collection exists, return its id
export async function ensureCollection(
  databaseId: string,
  name: string,
): Promise<string> {
  const existing = await prisma.collection.findUnique({
    where: { databaseId_name: { databaseId, name } },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.collection.create({
    data: { databaseId, name },
    select: { id: true },
  })
  return created.id
}

// Save updated doc back to DB (removes __prismaId before serializing)
export async function saveDoc(
  collectionId: string,
  doc: ParsedDoc,
): Promise<void> {
  const { __prismaId: prismaId, ...data } = doc
  if (prismaId) {
    await prisma.document.update({
      where: { id: prismaId },
      data: { data: JSON.stringify(data) },
    })
  } else {
    await prisma.document.create({
      data: { collectionId, data: JSON.stringify(data) },
    })
  }
}

export async function deleteDoc(prismaId: string | undefined): Promise<void> {
  if (!prismaId) return
  await prisma.document.delete({ where: { id: prismaId } })
}

export function collectMongoIndices(
  data: Record<string, unknown>[],
  filter: Record<string, unknown>,
): number[] {
  const filtered = applyMongoFilter(data, filter)
  const indices: number[] = []
  for (const item of filtered as Record<string, unknown>[]) {
    const idx = data.indexOf(item)
    if (idx !== -1) indices.push(idx)
  }
  return indices
}

import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { hashPassword } from "@/lib/api/db-auth"
import { autoGenerateId } from "@/lib/api/query"

export const mongoRouter = router({
  listDatabases: protectedProcedure.query(async ({ ctx }) => {
    const dbs = await ctx.prisma.database.findMany({
      where: { userId: ctx.user.id },
      include: {
        collections: {
          include: { _count: { select: { documents: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return dbs.map((db) => ({
      id: db.id,
      name: db.name,
      collectionCount: db.collections.length,
      documentCount: db.collections.reduce(
        (sum, c) => sum + c._count.documents, 0,
      ),
      userCount: 0,
      createdAt: db.createdAt,
    }))
  }),

  getDatabase: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          collections: {
            include: { _count: { select: { documents: true } } },
          },
        },
      })
      if (!db) throw new Error("Database not found")
      const collections = db.collections.map((c) => ({
        name: c.name,
        documentCount: c._count.documents,
      }))
      return {
        id: db.id,
        name: db.name,
        collections,
        createdAt: db.createdAt,
        updatedAt: db.updatedAt,
      }
    }),

  listCollections: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          collections: {
            include: { _count: { select: { documents: true } } },
          },
        },
      })
      if (!db) throw new Error("Database not found")
      return db.collections.map((c) => ({
        name: c.name,
        documentCount: c._count.documents,
      }))
    }),

  deleteDatabase: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!db) throw new Error("Database not found")
      await ctx.prisma.database.delete({ where: { id: input.id } })
      return { success: true }
    }),

  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.databaseUser.findMany({
      where: { userId: ctx.user.id },
      select: { id: true, username: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
    return users
  }),

  createUser: protectedProcedure
    .input(
      z.object({
        username: z.string().min(1).max(100),
        password: z.string().min(4).max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.databaseUser.findFirst({
        where: { userId: ctx.user.id, username: input.username },
      })
      if (existing) throw new Error("Username already exists")
      const hashed = await hashPassword(input.password)
      await ctx.prisma.databaseUser.create({
        data: {
          userId: ctx.user.id,
          username: input.username,
          password: hashed,
        },
      })
      return { success: true }
    }),

  deleteUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.databaseUser.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!user) throw new Error("User not found")
      await ctx.prisma.databaseUser.delete({ where: { id: input.id } })
      return { success: true }
    }),

  listCollectionDocuments: protectedProcedure
    .input(z.object({
      databaseId: z.string(),
      collection: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.databaseId, userId: ctx.user.id },
        include: {
          collections: {
            where: { name: input.collection },
            select: { id: true },
          },
        },
      })
      if (!db || db.collections.length === 0) return []

      const docs = await ctx.prisma.document.findMany({
        where: { collectionId: db.collections[0].id },
        orderBy: { createdAt: "asc" },
      })
      return docs.map((d) => ({
        id: d.id,
        data: JSON.parse(d.data) as Record<string, unknown>,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string(), databaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.prisma.document.findFirst({
        where: { id: input.documentId },
        include: {
          collection: {
            select: { database: { select: { userId: true } } },
          },
        },
      })
      if (!doc || doc.collection.database.userId !== ctx.user.id)
        throw new Error("Document not found")
      await ctx.prisma.document.delete({ where: { id: input.documentId } })
      return { success: true }
    }),

  insertDocument: protectedProcedure
    .input(
      z.object({
        databaseId: z.string(),
        collection: z.string(),
        document: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.databaseId, userId: ctx.user.id },
        include: {
          collections: {
            where: { name: input.collection },
            select: { id: true },
          },
        },
      })
      if (!db) throw new Error("Database not found")

      let colId: string
      if (db.collections.length > 0) {
        colId = db.collections[0].id
      } else {
        const col = await ctx.prisma.collection.create({
          data: { databaseId: db.id, name: input.collection },
          select: { id: true },
        })
        colId = col.id
      }

      const doc = { ...input.document }
      if (doc._id === undefined && doc.id === undefined) {
        const generated = autoGenerateId([])
        if (generated) doc[generated.key] = generated.value
      }

      await ctx.prisma.document.create({
        data: { collectionId: colId, data: JSON.stringify(doc) },
      })
      return { success: true }
    }),

  clearCollection: protectedProcedure
    .input(z.object({ databaseId: z.string(), collection: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.databaseId, userId: ctx.user.id },
        include: {
          collections: {
            where: { name: input.collection },
            select: { id: true },
          },
        },
      })
      if (!db) throw new Error("Database not found")
      if (db.collections.length === 0) throw new Error("Collection not found")

      await ctx.prisma.document.deleteMany({
        where: { collectionId: db.collections[0].id },
      })
      return { success: true }
    }),

  dropCollection: protectedProcedure
    .input(z.object({ databaseId: z.string(), collection: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await ctx.prisma.database.findFirst({
        where: { id: input.databaseId, userId: ctx.user.id },
        include: {
          collections: {
            where: { name: input.collection },
            select: { id: true },
          },
        },
      })
      if (!db) throw new Error("Database not found")
      if (db.collections.length === 0) throw new Error("Collection not found")

      await ctx.prisma.collection.delete({
        where: { id: db.collections[0].id },
      })
      return { success: true }
    }),
})

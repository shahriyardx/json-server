-- CreateCollection table
CREATE TABLE "collection" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_pkey" PRIMARY KEY ("id")
);

-- CreateDocument table
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- Indexes and unique constraints
CREATE UNIQUE INDEX "collection_databaseId_name_key" ON "collection"("databaseId", "name");
CREATE INDEX "collection_databaseId_idx" ON "collection"("databaseId");

CREATE INDEX "document_collectionId_idx" ON "document"("collectionId");

-- Foreign keys
ALTER TABLE "collection" ADD CONSTRAINT "collection_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "database"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document" ADD CONSTRAINT "document_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove unused content column from database
ALTER TABLE "database" DROP COLUMN IF EXISTS "content";

-- AlterTable
ALTER TABLE "json_file" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "api_key" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "json_file_version" (
    "id" TEXT NOT NULL,
    "jsonFileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "json_file_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_key_userId_idx" ON "api_key"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_keyHash_key" ON "api_key"("keyHash");

-- CreateIndex
CREATE INDEX "json_file_version_jsonFileId_idx" ON "json_file_version"("jsonFileId");

-- CreateIndex
CREATE INDEX "json_file_version_jsonFileId_createdAt_idx" ON "json_file_version"("jsonFileId", "createdAt");

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "json_file_version" ADD CONSTRAINT "json_file_version_jsonFileId_fkey" FOREIGN KEY ("jsonFileId") REFERENCES "json_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

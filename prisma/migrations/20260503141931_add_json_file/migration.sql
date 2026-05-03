-- CreateTable
CREATE TABLE "json_file" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "json_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "json_file_userId_idx" ON "json_file"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "json_file_userId_filename_key" ON "json_file"("userId", "filename");

-- AddForeignKey
ALTER TABLE "json_file" ADD CONSTRAINT "json_file_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

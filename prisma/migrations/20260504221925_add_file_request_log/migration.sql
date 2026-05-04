-- CreateTable
CREATE TABLE "file_request_log" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "referrers" JSONB,

    CONSTRAINT "file_request_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_request_log_fileId_idx" ON "file_request_log"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "file_request_log_fileId_date_key" ON "file_request_log"("fileId", "date");

-- AddForeignKey
ALTER TABLE "file_request_log" ADD CONSTRAINT "file_request_log_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "json_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

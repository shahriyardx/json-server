-- CreateTable
CREATE TABLE "webhook" (
    "id" TEXT NOT NULL,
    "jsonFileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryStatus" TEXT,
    "lastDeliveryResponseCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_jsonFileId_key" ON "webhook"("jsonFileId");

-- CreateIndex
CREATE INDEX "webhook_jsonFileId_idx" ON "webhook"("jsonFileId");

-- AddForeignKey
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_jsonFileId_fkey" FOREIGN KEY ("jsonFileId") REFERENCES "json_file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `secretHash` on the `webhook` table. All the data in the column will be lost.
  - Added the required column `secret` to the `webhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "webhook" DROP COLUMN "secretHash",
ADD COLUMN     "secret" TEXT NOT NULL;

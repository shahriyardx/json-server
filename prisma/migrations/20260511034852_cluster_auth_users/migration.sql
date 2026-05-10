-- AlterTable: change DatabaseUser from per-database to per-user
ALTER TABLE "database_user" DROP CONSTRAINT "database_user_databaseId_fkey";
DROP INDEX "database_user_databaseId_username_key";
ALTER TABLE "database_user" DROP COLUMN "databaseId";
ALTER TABLE "database_user" ADD COLUMN "userId" TEXT NOT NULL;
CREATE UNIQUE INDEX "database_user_userId_username_key" ON "database_user"("userId", "username");
ALTER TABLE "database_user" ADD CONSTRAINT "database_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

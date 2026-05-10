-- CreateTable
CREATE TABLE "database" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_user" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "database_userId_name_key" ON "database"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "database_user_databaseId_username_key" ON "database_user"("databaseId", "username");

-- AddForeignKey
ALTER TABLE "database" ADD CONSTRAINT "database_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_user" ADD CONSTRAINT "database_user_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

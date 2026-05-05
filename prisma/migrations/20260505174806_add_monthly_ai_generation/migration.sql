-- CreateTable
CREATE TABLE "user_monthly_ai_generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_monthly_ai_generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_monthly_ai_generation_userId_idx" ON "user_monthly_ai_generation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_monthly_ai_generation_userId_month_year_key" ON "user_monthly_ai_generation"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "user_monthly_ai_generation" ADD CONSTRAINT "user_monthly_ai_generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Expense (operating expenses tracked by admins/super-admins).
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Expense_spentAt_idx" ON "Expense"("spentAt");
CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category");

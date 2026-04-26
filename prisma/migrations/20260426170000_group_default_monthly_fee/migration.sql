-- Add a default monthly fee to Group so admins can set a base price per
-- group; per-student overrides still live in StudentGroup.monthlyFee.
ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "defaultMonthlyFee" DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable: add category column to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'barriles';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");

-- Update existing products to barriles
UPDATE "Product" SET "category" = 'barriles' WHERE "category" IS NULL OR "category" = '';

-- CreateTable: Category
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Insert categoría ejemplo (id determinístico para migración)
INSERT INTO "Category" ("id", "name", "order", "createdAt", "updatedAt")
VALUES ('clp7categoriaejemplo001', 'categoria ejemplo', 0, NOW(), NOW());

-- Add categoryId to Product (nullable first)
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- Update existing products to use categoria ejemplo
UPDATE "Product" SET "categoryId" = 'clp7categoriaejemplo001';

-- Make categoryId required
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

-- Drop old category column
ALTER TABLE "Product" DROP COLUMN IF EXISTS "category";

-- Create index
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- Add FK constraint
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

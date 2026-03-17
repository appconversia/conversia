-- Ejecutar en Neon (o cualquier PostgreSQL) para agregar el campo videos a Product.
-- Opción 1: Desde Neon SQL Editor
-- Opción 2: psql -h <host> -U <user> -d <db> -f scripts/migrate-add-videos.sql

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "videos" TEXT;

-- SaaS multi-tenant: Plan, Tenant y tenantId en tablas (backfill antes de NOT NULL)

CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

INSERT INTO "Plan" ("id", "name", "slug", "maxUsers", "sortOrder")
VALUES ('plan_free', 'Gratis', 'free', 5, 0);

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "planId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Tenant" ("id", "name", "slug", "planId", "active", "createdAt", "updatedAt")
VALUES ('tenant_default', 'Conversia Default', 'default', 'plan_free', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- User: tenant opcional (null = super admin de plataforma)
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
UPDATE "User" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- AppConfig: de clave única global a (tenantId, key)
DROP INDEX IF EXISTS "AppConfig_key_key";
DROP INDEX IF EXISTS "AppConfig_key_idx";

ALTER TABLE "AppConfig" ADD COLUMN "tenantId" TEXT;
UPDATE "AppConfig" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "AppConfig" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "AppConfig_tenantId_key_key" ON "AppConfig"("tenantId", "key");
CREATE INDEX "AppConfig_tenantId_idx" ON "AppConfig"("tenantId");

-- ConversationTag
DROP INDEX IF EXISTS "ConversationTag_slug_key";
DROP INDEX IF EXISTS "ConversationTag_slug_idx";

ALTER TABLE "ConversationTag" ADD COLUMN "tenantId" TEXT;
UPDATE "ConversationTag" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "ConversationTag" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ConversationTag_tenantId_slug_key" ON "ConversationTag"("tenantId", "slug");
CREATE INDEX "ConversationTag_tenantId_idx" ON "ConversationTag"("tenantId");

-- Contact
DROP INDEX IF EXISTS "Contact_phone_key";
DROP INDEX IF EXISTS "Contact_phone_idx";

ALTER TABLE "Contact" ADD COLUMN "tenantId" TEXT;
UPDATE "Contact" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "Contact" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Contact_tenantId_phone_key" ON "Contact"("tenantId", "phone");
CREATE INDEX "Contact_tenantId_idx" ON "Contact"("tenantId");

-- Conversation
ALTER TABLE "Conversation" ADD COLUMN "tenantId" TEXT;
UPDATE "Conversation" c SET "tenantId" = COALESCE(
  (SELECT ct."tenantId" FROM "Contact" ct WHERE ct."id" = c."contactId"),
  'tenant_default'
) WHERE c."tenantId" IS NULL;
UPDATE "Conversation" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "Conversation" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Conversation_tenantId_idx" ON "Conversation"("tenantId");

-- Category
ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
UPDATE "Category" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- Lead
ALTER TABLE "Lead" ADD COLUMN "tenantId" TEXT;
UPDATE "Lead" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- BotFlow
ALTER TABLE "BotFlow" ADD COLUMN "tenantId" TEXT;
UPDATE "BotFlow" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "BotFlow" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "BotFlow" ADD CONSTRAINT "BotFlow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "BotFlow_tenantId_idx" ON "BotFlow"("tenantId");

-- BotLog
ALTER TABLE "BotLog" ADD COLUMN "tenantId" TEXT;
UPDATE "BotLog" bl SET "tenantId" = COALESCE(
  (SELECT c."tenantId" FROM "Conversation" c WHERE c."id" = bl."conversationId"),
  'tenant_default'
) WHERE bl."tenantId" IS NULL;
UPDATE "BotLog" SET "tenantId" = 'tenant_default' WHERE "tenantId" IS NULL;
ALTER TABLE "BotLog" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "BotLog" ADD CONSTRAINT "BotLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "BotLog_tenantId_idx" ON "BotLog"("tenantId");

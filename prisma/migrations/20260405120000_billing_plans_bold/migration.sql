-- Billing, planes en USD, packs extra, pagos Bold (estructura)

CREATE TYPE "BillingStatus" AS ENUM ('trial', 'active', 'past_due', 'suspended');
CREATE TYPE "PaymentRecordStatus" AS ENUM ('pending', 'paid', 'failed', 'expired');

ALTER TABLE "Plan" ADD COLUMN "priceUsdCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN "includedConversations" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "Plan" ADD COLUMN "extraPackConversations" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Plan" ADD COLUMN "extraPackPriceUsdCents" INTEGER NOT NULL DEFAULT 1500;
ALTER TABLE "Plan" ADD COLUMN "tagline" TEXT;

ALTER TABLE "Tenant" ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'trial';
ALTER TABLE "Tenant" ADD COLUMN "subscriptionStartAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "subscriptionEndAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "usagePeriodMonthStart" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "conversationsInPeriod" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tenant" ADD COLUMN "extraConversationPacks" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Tenant_billingStatus_idx" ON "Tenant"("billingStatus");
CREATE INDEX "Tenant_subscriptionEndAt_idx" ON "Tenant"("subscriptionEndAt");

CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "description" TEXT,
    "boldLinkId" TEXT,
    "checkoutUrl" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "packCount" INTEGER,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentRecord_reference_key" ON "PaymentRecord"("reference");
CREATE INDEX "PaymentRecord_tenantId_idx" ON "PaymentRecord"("tenantId");
CREATE INDEX "PaymentRecord_status_idx" ON "PaymentRecord"("status");

ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

UPDATE "Tenant" SET
  "billingStatus" = 'active',
  "subscriptionEndAt" = CURRENT_TIMESTAMP + interval '365 days',
  "subscriptionStartAt" = COALESCE("subscriptionStartAt", CURRENT_TIMESTAMP),
  "usagePeriodMonthStart" = date_trunc('month', CURRENT_TIMESTAMP)
WHERE "subscriptionEndAt" IS NULL;

UPDATE "Plan" SET
  "priceUsdCents" = 0,
  "includedConversations" = 50,
  "tagline" = 'Plan gratuito / demo'
WHERE "id" = 'plan_free';

INSERT INTO "Plan" ("id","name","slug","maxUsers","sortOrder","priceUsdCents","includedConversations","extraPackConversations","extraPackPriceUsdCents","tagline")
VALUES
  ('plan_despegue','Despegue','despegue',2,10,1900,100,1000,1500,'100 conversaciones/mes · valida sin fricción'),
  ('plan_crecimiento','Crecimiento','crecimiento',5,20,4900,1000,1000,1500,'1000 conversaciones · mejor relación precio/volumen'),
  ('plan_escala','Escala','escala',15,30,6900,2500,1000,1500,'2500 conversaciones · más asientos para tu equipo'),
  ('plan_dominio','Dominio','dominio',25,40,9900,5000,1000,1500,'5000 conversaciones · alto volumen y prioridad')
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "maxUsers" = EXCLUDED."maxUsers",
  "sortOrder" = EXCLUDED."sortOrder",
  "priceUsdCents" = EXCLUDED."priceUsdCents",
  "includedConversations" = EXCLUDED."includedConversations",
  "extraPackConversations" = EXCLUDED."extraPackConversations",
  "extraPackPriceUsdCents" = EXCLUDED."extraPackPriceUsdCents",
  "tagline" = EXCLUDED."tagline";

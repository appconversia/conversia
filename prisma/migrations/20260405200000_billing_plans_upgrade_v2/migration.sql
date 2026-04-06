-- Planes: relaciones nombradas, downgrade/upgrade, prorrateo (targetPlanId)
ALTER TABLE "Tenant" ADD COLUMN "pendingPlanId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "pendingPlanEffectiveAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "cancelSubscriptionAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PaymentRecord" ADD COLUMN "targetPlanId" TEXT;

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Tenant_pendingPlanId_idx" ON "Tenant"("pendingPlanId");

-- Catálogo de planes (1000 / 2500 / 5000 / 10000 conversaciones correlacionado con precio y usuarios)
UPDATE "Plan" SET
  "maxUsers" = 5,
  "priceUsdCents" = 0,
  "includedConversations" = 50,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 1500,
  "tagline" = 'Ideal para probar: 50 conversaciones/mes · 5 usuarios del panel'
WHERE "slug" = 'plan_free';

UPDATE "Plan" SET
  "name" = 'Despegue',
  "maxUsers" = 10,
  "sortOrder" = 10,
  "priceUsdCents" = 2900,
  "includedConversations" = 1000,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 1500,
  "tagline" = '1.000 conversaciones/mes · 10 usuarios · packs de +1.000'
WHERE "slug" = 'despegue';

UPDATE "Plan" SET
  "name" = 'Crecimiento',
  "maxUsers" = 25,
  "sortOrder" = 20,
  "priceUsdCents" = 5900,
  "includedConversations" = 2500,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 1400,
  "tagline" = '2.500 conversaciones/mes · 25 usuarios · mejor costo por volumen'
WHERE "slug" = 'crecimiento';

UPDATE "Plan" SET
  "name" = 'Escala',
  "maxUsers" = 50,
  "sortOrder" = 30,
  "priceUsdCents" = 9900,
  "includedConversations" = 5000,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 1300,
  "tagline" = '5.000 conversaciones/mes · 50 usuarios · equipos grandes'
WHERE "slug" = 'escala';

UPDATE "Plan" SET
  "name" = 'Dominio',
  "maxUsers" = 100,
  "sortOrder" = 40,
  "priceUsdCents" = 14900,
  "includedConversations" = 10000,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 1200,
  "tagline" = '10.000 conversaciones/mes · 100 usuarios · escala de +1.000 en cada pack'
WHERE "slug" = 'dominio';

-- Límites de conversaciones/usuarios; Escala→Profesional, Dominio→Empresa; packs US$15 solo en Empresa

UPDATE "Plan" SET
  "maxUsers" = 1,
  "priceUsdCents" = 0,
  "includedConversations" = 50,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 0,
  "tagline" = '50 conversaciones/mes · 1 usuario'
WHERE "id" = 'plan_free';

UPDATE "Plan" SET
  "maxUsers" = 2,
  "sortOrder" = 10,
  "priceUsdCents" = 2900,
  "includedConversations" = 500,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 0,
  "tagline" = '500 conversaciones/mes · 2 usuarios'
WHERE "slug" = 'despegue';

UPDATE "Plan" SET
  "maxUsers" = 5,
  "sortOrder" = 20,
  "priceUsdCents" = 5900,
  "includedConversations" = 1000,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 0,
  "tagline" = '1.000 conversaciones/mes · 5 usuarios'
WHERE "slug" = 'crecimiento';

UPDATE "Plan" SET
  "name" = 'Profesional',
  "slug" = 'profesional',
  "maxUsers" = 10,
  "sortOrder" = 30,
  "priceUsdCents" = 9900,
  "includedConversations" = 3000,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 0,
  "tagline" = '3.000 conversaciones/mes · 10 usuarios'
WHERE "slug" = 'escala';

UPDATE "Plan" SET
  "name" = 'Empresa',
  "slug" = 'empresa',
  "maxUsers" = 20,
  "sortOrder" = 40,
  "priceUsdCents" = 14900,
  "includedConversations" = 10000,
  "extraPackConversations" = 1000,
  "extraPackPriceUsdCents" = 1500,
  "tagline" = '10.000 conversaciones/mes · 20 usuarios · +1.000 conv. por US$15 por pack'
WHERE "slug" = 'dominio';

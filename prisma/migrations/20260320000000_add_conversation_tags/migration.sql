-- CreateTable: ConversationTag
CREATE TABLE "ConversationTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationTag_pkey" PRIMARY KEY ("id")
);

-- Insert system tags (bot protegido, sin_asignar y asistidas editables en nombre pero no borrables)
INSERT INTO "ConversationTag" ("id", "name", "slug", "isSystem", "order", "createdAt", "updatedAt") VALUES
('clp7tagbot001', 'Bot', 'bot', true, 0, NOW(), NOW()),
('clp7tagsinasignar001', 'Sin Asignar', 'sin_asignar', true, 1, NOW(), NOW()),
('clp7tagasistidas001', 'Asistidas', 'asistidas', true, 2, NOW(), NOW());

-- Add conversationTagId to Conversation
ALTER TABLE "Conversation" ADD COLUMN "conversationTagId" TEXT;

-- Create index and FK
CREATE UNIQUE INDEX "ConversationTag_slug_key" ON "ConversationTag"("slug");
CREATE INDEX "ConversationTag_slug_idx" ON "ConversationTag"("slug");
CREATE INDEX "ConversationTag_order_idx" ON "ConversationTag"("order");
CREATE INDEX "Conversation_conversationTagId_idx" ON "Conversation"("conversationTagId");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_conversationTagId_fkey" FOREIGN KEY ("conversationTagId") REFERENCES "ConversationTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar conversaciones existentes a etiquetas según su estado
UPDATE "Conversation" SET "conversationTagId" = 'clp7tagbot001'
WHERE "channel" = 'bot' AND "handoffRequestedAt" IS NULL AND "assignedToId" IS NULL;
UPDATE "Conversation" SET "conversationTagId" = 'clp7tagsinasignar001'
WHERE "channel" = 'bot' AND "handoffRequestedAt" IS NOT NULL AND "assignedToId" IS NULL;
UPDATE "Conversation" SET "conversationTagId" = 'clp7tagasistidas001'
WHERE "assignedToId" IS NOT NULL;

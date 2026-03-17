import { prisma } from "@/lib/db";

export type LeadInput = {
  phone: string;
  name?: string | null;
  productInterest?: string | null;
  interestLevel?: "alto" | "medio" | "bajo" | null;
  priority?: "urgente" | "normal" | "baja" | null;
  status?: string;
  notes?: string | null;
  conversationId?: string | null;
};

/**
 * Crea o actualiza un lead por teléfono. Si ya existe, actualiza campos no vacíos.
 */
export async function upsertLead(input: LeadInput): Promise<void> {
  const phone = input.phone.replace(/\D/g, "").trim();
  if (!phone) return;

  const data = {
    name: input.name ?? undefined,
    productInterest: input.productInterest ?? undefined,
    interestLevel: input.interestLevel ?? undefined,
    priority: input.priority ?? undefined,
    status: input.status ?? "Pendiente",
    notes: input.notes ?? undefined,
    conversationId: input.conversationId ?? undefined,
  };

  const existing = await prisma.lead.findFirst({
    where: { phone },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.productInterest != null && { productInterest: data.productInterest }),
        ...(data.interestLevel != null && { interestLevel: data.interestLevel }),
        ...(data.priority != null && { priority: data.priority }),
        ...(data.status != null && { status: data.status }),
        ...(data.notes != null && { notes: data.notes }),
        ...(data.conversationId != null && { conversationId: data.conversationId }),
      },
    });
  } else {
    await prisma.lead.create({
      data: {
        phone,
        name: data.name ?? null,
        productInterest: data.productInterest ?? null,
        interestLevel: data.interestLevel ?? null,
        priority: data.priority ?? null,
        status: data.status ?? "Pendiente",
        notes: data.notes ?? null,
        conversationId: data.conversationId ?? null,
      },
    });
  }
}

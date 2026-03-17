import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const SUPER_ADMIN_ROLES = ["super_admin"];

/**
 * GET /api/diagnostics/contact/[phone]
 * Verificación de un contacto en BD - SOLO LECTURA. Solo super_admin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!SUPER_ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Solo super administradores" }, { status: 403 });
  }

  const { phone } = await params;
  const clean = (phone ?? "").replace(/\D/g, "");
  const suffix = clean.slice(-9); // últimos 9 dígitos (ej. 3008775601)

  if (!clean) {
    return NextResponse.json({ error: "Falta número" }, { status: 400 });
  }

  // Buscar contacto
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { phone: clean },
        { phone: phone },
        { phone: { contains: suffix } },
      ],
    },
  });

  if (contacts.length === 0) {
    return NextResponse.json({
      phone: phone,
      found: false,
      message: "Contacto no encontrado en BD",
      hint: "El número debe haber escrito al menos una vez para existir en la BD.",
    });
  }

  const contactIds = contacts.map((c) => c.id);

  const convs = await prisma.conversation.findMany({
    where: { contactId: { in: contactIds } },
    include: { contact: true, assignedTo: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const convIds = convs.map((c) => c.id);

  const messages = await prisma.message.findMany({
    where: { conversationId: { in: convIds } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { sender: { select: { email: true } } },
  });

  const templateMsgs = messages.filter(
    (m) => m.senderId && (m.content?.includes("[Plantilla:") || m.content?.includes("— "))
  );

  const logs = await prisma.botLog.findMany({
    where: {
      OR: [{ phone: { contains: suffix } }, { metadata: { contains: suffix } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const lastFromContact = messages.find((m) => m.senderContactId);
  const lastFromUs = messages.find((m) => m.senderId && !m.senderContactId);

  return NextResponse.json({
    phone: phone,
    found: true,
    contact: contacts[0],
    conversations: convs.map((c) => ({
      id: c.id,
      channel: c.channel,
      assignedTo: c.assignedTo?.email,
      handoffRequestedAt: c.handoffRequestedAt,
    })),
    lastMessageFromContact: lastFromContact
      ? { createdAt: lastFromContact.createdAt, content: lastFromContact.content?.slice(0, 100) }
      : null,
    lastMessageFromUs: lastFromUs
      ? {
          createdAt: lastFromUs.createdAt,
          status: lastFromUs.status,
          whatsappMessageId: lastFromUs.whatsappMessageId,
          content: lastFromUs.content?.slice(0, 100),
        }
      : null,
    templateMessagesSent: templateMsgs.map((m) => ({
      createdAt: m.createdAt,
      status: m.status,
      whatsappMessageId: m.whatsappMessageId,
    })),
    botLogs: logs.map((l) => ({
      createdAt: l.createdAt,
      level: l.level,
      stage: l.stage,
      message: l.message,
      metadata: l.metadata,
    })),
    diagnosis: buildDiagnosis(contacts[0], messages, templateMsgs, lastFromContact, lastFromUs),
  });
}

function buildDiagnosis(
  contact: { phone: string },
  messages: { senderId: string | null; senderContactId: string | null; whatsappMessageId: string | null; status: string }[],
  templateMsgs: { whatsappMessageId: string | null; status: string }[],
  lastFromContact: { createdAt: Date } | undefined,
  lastFromUs: { whatsappMessageId: string | null; status: string } | undefined
): string[] {
  const hints: string[] = [];

  if (!lastFromContact) {
    hints.push("El contacto nunca ha enviado un mensaje (o no hay registro). Para plantillas, el usuario debe haberte escrito al menos una vez.");
  } else {
    const hoursSince = (Date.now() - new Date(lastFromContact.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) {
      hints.push(`Han pasado ${Math.round(hoursSince)}h desde el último mensaje del contacto. Plantillas son para reactivar en este caso.`);
    }
  }

  const ourMsgsWithoutWaId = messages.filter((m) => m.senderId && !m.senderContactId && !m.whatsappMessageId);
  if (ourMsgsWithoutWaId.length > 0) {
    hints.push("Hay mensajes enviados por nosotros SIN whatsappMessageId. Eso indica que la API de Meta no devolvió ID (posible fallo silencioso).");
  }

  const stuckSent = templateMsgs.filter((m) => m.status === "sent" && m.whatsappMessageId);
  if (stuckSent.length > 0) {
    hints.push("Plantillas con status 'sent' pero nunca 'delivered': Meta aceptó el envío pero el mensaje no llegó. Posibles causas: bloqueado, número sin WhatsApp, o restricciones de la cuenta.");
  }

  if (lastFromUs && !lastFromUs.whatsappMessageId) {
    hints.push("Último mensaje nuestro sin whatsappMessageId: la API de Meta no devolvió ID al enviar.");
  }

  hints.push("Número en BD: " + contact.phone + " (debe ser internacional sin +, ej. 573008775601)");

  return hints;
}

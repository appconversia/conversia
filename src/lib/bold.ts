/**
 * Bold — Botón de pagos + API Link de pagos (misma llave de identidad).
 * @see https://developers.bold.co/pagos-en-linea/llaves-de-integracion (llave de identidad + llave secreta)
 * @see https://developers.bold.co/pagos-en-linea/api-integration
 * Base: https://integrations.api.bold.co
 * Autenticación: Authorization: x-api-key {llave_de_identidad}
 */

import { createHmac, timingSafeEqual } from "crypto";

const BOLD_API_BASE = "https://integrations.api.bold.co";

export type BoldLinkResult =
  | { ok: true; paymentLink: string; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Verifica firma del webhook (HMAC-SHA256 sobre Base64 del cuerpo UTF-8).
 * @see https://developers.bold.co/webhook — header x-bold-signature
 * En pruebas, la llave secreta es string vacío.
 */
export function verifyBoldWebhookSignature(
  rawBodyUtf8: string,
  signatureHeader: string | null | undefined,
  secretKey: string
): boolean {
  if (!signatureHeader?.trim()) return false;
  const expectedHex = createHmac("sha256", secretKey)
    .update(Buffer.from(rawBodyUtf8, "utf8").toString("base64"), "utf8")
    .digest("hex");
  const got = signatureHeader.trim().toLowerCase();
  try {
    const a = Buffer.from(expectedHex, "hex");
    const b = Buffer.from(got, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Crea un link de pago en USD (tienda en USD en Bold).
 * La referencia va en la descripción; el webhook puede enlazar por id de link (LNK_…) o metadata.
 */
export async function createBoldPaymentLink(params: {
  identityKey: string;
  /** Monto total en USD (decimal) */
  amountUsd: number;
  description: string;
  /** Referencia interna guardada en BD y en la descripción del link */
  reference: string;
  isSandbox?: boolean;
}): Promise<BoldLinkResult> {
  const desc = `${params.description} · ref:${params.reference}`.slice(0, 240);
  const body: Record<string, unknown> = {
    amount_type: "CLOSE",
    amount: {
      currency: "USD",
      total_amount: Math.round(params.amountUsd * 100) / 100,
    },
    description: desc,
  };
  if (params.isSandbox) {
    body.is_sandbox = true;
  }

  const res = await fetch(`${BOLD_API_BASE}/online/link/v1`, {
    method: "POST",
    headers: {
      Authorization: `x-api-key ${params.identityKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    payload?: { payment_link?: string; url?: string };
    errors?: { message?: string }[];
  };

  if (!res.ok) {
    const msg = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
    return { ok: false, error: msg };
  }

  const link = json.payload?.payment_link;
  const url = json.payload?.url;
  if (!link || !url) {
    return { ok: false, error: "Respuesta Bold inválida" };
  }

  return { ok: true, paymentLink: link, checkoutUrl: url };
}

export async function getBoldPaymentLinkStatus(identityKey: string, paymentLinkId: string) {
  const res = await fetch(`${BOLD_API_BASE}/online/link/v1/${encodeURIComponent(paymentLinkId)}`, {
    headers: {
      Authorization: `x-api-key ${identityKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return res.json();
}

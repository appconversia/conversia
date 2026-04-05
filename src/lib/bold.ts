/**
 * Bold Pagos en línea — API de links de pago.
 * @see https://developers.bold.co/pagos-en-linea/api-integration
 * Base: https://integrations.api.bold.co
 * Autenticación: header Authorization: x-api-key {llave_de_identidad}
 */

const BOLD_API_BASE = "https://integrations.api.bold.co";

export type BoldLinkResult =
  | { ok: true; paymentLink: string; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Crea un link de pago en USD (tienda configurada en USD en Bold).
 * `total_amount` en dólares (ej. 49.0 para US$49).
 */
export async function createBoldPaymentLink(params: {
  identityKey: string;
  /** Monto total en USD (decimal) */
  amountUsd: number;
  description: string;
  /** Referencia interna (se puede mapear en metadata si la API lo permite) */
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

/**
 * Prorrateo de upgrade: paga la diferencia de precio proporcional al tiempo restante del periodo actual.
 * Si no hay fechas de periodo fiables, se cobra el precio completo del upgrade (sin prorrateo).
 */

const DEFAULT_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export type ProrationResult = {
  amountUsdCents: number;
  /** Texto para mostrar en UI / descripción de pago */
  summary: string;
  /** Fracción del periodo restante (0–1) */
  fractionRemaining: number;
  usedProration: boolean;
};

export function computeUpgradeProration(params: {
  now: Date;
  subscriptionStartAt: Date | null;
  subscriptionEndAt: Date | null;
  currentPriceUsdCents: number;
  newPriceUsdCents: number;
}): ProrationResult {
  const { now, subscriptionStartAt, subscriptionEndAt, currentPriceUsdCents, newPriceUsdCents } = params;

  if (newPriceUsdCents <= currentPriceUsdCents) {
    return {
      amountUsdCents: 0,
      summary: "No hay cargo: el plan destino es igual o menor (usa programar downgrade).",
      fractionRemaining: 0,
      usedProration: false,
    };
  }

  const diff = newPriceUsdCents - currentPriceUsdCents;

  if (!subscriptionEndAt || subscriptionEndAt.getTime() <= now.getTime()) {
    return {
      amountUsdCents: diff,
      summary: `Upgrade: diferencia de plan ${(diff / 100).toFixed(2)} USD (periodo vencido o sin fecha; sin prorrateo).`,
      fractionRemaining: 0,
      usedProration: false,
    };
  }

  const end = subscriptionEndAt.getTime();
  const start = subscriptionStartAt?.getTime() ?? end - DEFAULT_PERIOD_MS;
  const periodMs = Math.max(1, end - start);
  const remainingMs = Math.max(0, end - now.getTime());
  const fraction = Math.min(1, remainingMs / periodMs);

  if (fraction <= 0 || !Number.isFinite(fraction)) {
    return {
      amountUsdCents: diff,
      summary: `Upgrade: ${(diff / 100).toFixed(2)} USD (sin tiempo restante calculable).`,
      fractionRemaining: 0,
      usedProration: false,
    };
  }

  const raw = Math.round(diff * fraction);
  const amountUsdCents = Math.max(1, raw);

  return {
    amountUsdCents,
    summary: `Upgrade prorrateado (~${Math.round(fraction * 100)}% del periodo): ${(amountUsdCents / 100).toFixed(2)} USD`,
    fractionRemaining: fraction,
    usedProration: true,
  };
}

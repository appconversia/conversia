/**
 * Slug del único plan que permite comprar packs extra de conversaciones (+1.000 por US$15).
 * Debe coincidir con el registro en la tabla Plan (slug).
 */
export const PLAN_SLUG_EXTRA_PACKS = "empresa" as const;

export function planAllowsExtraConversationPacks(slug: string | null | undefined): boolean {
  return slug === PLAN_SLUG_EXTRA_PACKS;
}

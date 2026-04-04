/**
 * Vercel serverless no expone WebSockets persistentes entre instancias.
 * Los eventos de UI se actualizan por polling (ver conversaciones/page.tsx).
 * Esta función sustituye el antiguo disparo de Pusher; se mantiene para no romper llamadas.
 */
export async function emitRealtimeEvent(
  channel: string,
  event: string,
  data: unknown
): Promise<void> {
  void channel;
  void event;
  void data;
  /* no-op: el cliente usa polling */
}

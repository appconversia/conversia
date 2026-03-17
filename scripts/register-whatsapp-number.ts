/**
 * Script para registrar el número de WhatsApp vía API de Meta.
 * Uso: npx tsx scripts/register-whatsapp-number.ts
 *
 * Necesita: WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env
 * O pásalos como argumentos: TOKEN=xxx PHONE_ID=xxx npx tsx scripts/register-whatsapp-number.ts
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.TOKEN;

async function main() {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Faltan variables. Usa:");
    console.error("  WHATSAPP_ACCESS_TOKEN=xxx WHATSAPP_PHONE_NUMBER_ID=xxx npx tsx scripts/register-whatsapp-number.ts");
    console.error("O configúralas en .env");
    process.exit(1);
  }

  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/register`;
  const pin = process.env.PIN; // PIN de 2FA si aplica

  const body: { messaging_product: string; pin?: string } = { messaging_product: "whatsapp" };
  if (pin) body.pin = pin;

  console.log("Registrando número...");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message: string } };
  if (!res.ok) {
    console.error("Error:", data.error?.message ?? res.status, data);
    process.exit(1);
  }
  console.log("OK. Verifica en Meta si el estado cambió de Pendiente a activo.");
}

main();

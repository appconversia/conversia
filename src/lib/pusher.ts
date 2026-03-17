import Pusher from "pusher";

const config = {
  appId: process.env.PUSHER_APP_ID ?? "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY ?? "",
  secret: process.env.PUSHER_SECRET ?? "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2",
};

export function getPusherServer(): Pusher | null {
  if (!config.appId || !config.key || !config.secret) return null;
  return new Pusher({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    cluster: config.cluster,
    useTLS: true,
  });
}

export function isPusherConfigured(): boolean {
  return !!(config.appId && config.key && config.secret);
}

export const PUSHER_CHANNEL_PREFIX = "conv-";

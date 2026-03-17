"use client";

import { useEffect, useRef } from "react";
import Pusher, { type Channel } from "pusher-js";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2";

export function isPusherClientConfigured(): boolean {
  return !!key;
}

export const PUSHER_CHANNEL_PREFIX = "conv-";

let pusherClient: Pusher | null = null;

function getPusherClient(): Pusher | null {
  if (!key) return null;
  if (pusherClient) return pusherClient;
  pusherClient = new Pusher(key, {
    cluster,
    authEndpoint: undefined,
  });
  return pusherClient;
}

type EventHandler = (data: unknown) => void;

export function usePusherChannel(
  channelName: string | null,
  events: { event: string; handler: EventHandler }[]
) {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const handlersRef = useRef(events);
  handlersRef.current = events;

  useEffect(() => {
    if (!channelName) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    pusherRef.current = pusher;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    for (const { event, handler } of handlersRef.current) {
      channel.bind(event, handler);
    }

    return () => {
      for (const { event, handler } of handlersRef.current) {
        channel.unbind(event, handler);
      }
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName]);
}

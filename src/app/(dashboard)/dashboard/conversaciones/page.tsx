"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { usePusherChannel, isPusherClientConfigured, PUSHER_CHANNEL_PREFIX } from "@/hooks/usePusher";
import { EmojiPicker } from "@/components/dashboard/emoji-picker";
import { AttachmentsMenu, type AttachmentType } from "@/components/dashboard/attachments-menu";
import { AudioRecorder } from "@/components/dashboard/audio-recorder";
import { VideoRecorder } from "@/components/dashboard/video-recorder";
import { PhotoCapture } from "@/components/dashboard/photo-capture";
import { MediaViewer } from "@/components/dashboard/media-viewers";
import { TemplatePreview, buildTemplateDisplayContent, type TemplateForPreview } from "@/components/dashboard/template-preview";

type User = { id: string; email: string; name: string | null };
type ConversationTagInfo = { id: string; name: string; slug: string } | null;
type ConversationItem = {
  id: string;
  channel?: string;
  handoffRequestedAt?: string | null;
  handoffPending?: boolean;
  restricted?: boolean;
  conversationTag?: ConversationTagInfo;
  otherUser: User | null;
  assignedTo: User | null;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  lastMessageFromContactAt?: string | null;
  unread?: boolean;
  unreadCount?: number;
};

type UnreadByTab = { todas: number; bot: number; sin_asignar: number; asistidas: number };
type ReplyToInfo = {
  id: string;
  content: string;
  type: string;
  sender: User | null;
  fromContact: boolean;
};

type MessageItem = {
  id: string;
  content: string;
  type?: string;
  mediaUrl?: string | null;
  mediaFilename?: string | null;
  senderId: string;
  sender: User;
  status: string;
  createdAt: string;
  fromContact?: boolean;
  replyTo?: ReplyToInfo | null;
};

const POLL_INTERVAL_REALTIME = 4000;
const POLL_INTERVAL_FALLBACK = 2000;
const LIST_POLL_INTERVAL = 3000;
const LOAD_DEBOUNCE_MS = 400;

const WINDOW_24H_MS = 24 * 60 * 60 * 1000;

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("es", { weekday: "short" });
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

function get24hWindowRemaining(lastFromContactAt: string | null | undefined): string | null {
  if (!lastFromContactAt) return null;
  const end = new Date(lastFromContactAt).getTime() + WINDOW_24H_MS;
  const now = Date.now();
  const remaining = Math.max(0, end - now);
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function get24hWindowElapsed(lastFromContactAt: string): string {
  const end = new Date(lastFromContactAt).getTime() + WINDOW_24H_MS;
  const elapsed = Math.max(0, Date.now() - end);
  const d = Math.floor(elapsed / 86400000);
  const h = Math.floor((elapsed % 86400000) / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatLastMessageFullDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const h = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  const sec = d.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${min}:${sec}`;
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ConversacionesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [assignedTo, setAssignedTo] = useState<User | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [tabNivel1, setTabNivel1] = useState<string>("todas"); // todas|bot|sin_asignar|asistidas|restringidos|tagId
  const [tabNivel2, setTabNivel2] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadByTab, setUnreadByTab] = useState<UnreadByTab>({ todas: 0, bot: 0, sin_asignar: 0, asistidas: 0 });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<TemplateForPreview[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateSending, setTemplateSending] = useState(false);
  const [templateBodyParams, setTemplateBodyParams] = useState<string[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [conversationTags, setConversationTags] = useState<{ id: string; name: string; slug: string; isSystem: boolean }[]>([]);
  const [conversationDetail, setConversationDetail] = useState<{
    contact?: { phone: string; name: string | null };
    messagesCount?: number;
    createdAt?: string;
  } | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [myUser, setMyUser] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [myRole, setMyRole] = useState<string>("colaborador");
  const [, setCountdownTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const attachBtnRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const loadConversationsRaw = useCallback(async () => {
    try {
      const r = await fetch("/api/conversations", {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 401) {
        router.replace("/login");
        return;
      }
      const text = await r.text();
      let data: { conversations?: ConversationItem[]; unreadByTab?: UnreadByTab; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: "Respuesta inválida" };
      }
      if (data.conversations) setConversations(data.conversations);
      if (data.unreadByTab) setUnreadByTab(data.unreadByTab);
      if (!r.ok) {
        console.error("Conversaciones error:", data.error ?? data, r.status);
      }
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadConversations = useCallback(() => {
    if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
    loadDebounceRef.current = setTimeout(() => {
      loadDebounceRef.current = null;
      loadConversationsRaw();
    }, LOAD_DEBOUNCE_MS);
  }, [loadConversationsRaw]);

  const loadConversationsNow = useCallback(() => {
    if (loadDebounceRef.current) {
      clearTimeout(loadDebounceRef.current);
      loadDebounceRef.current = null;
    }
    loadConversationsRaw();
  }, [loadConversationsRaw]);

  const loadMessages = useCallback(async (convId: string, opts?: { scroll?: boolean }) => {
    const r = await fetch(`/api/conversations/${convId}/messages`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) return;
    const data = await r.json();
    setMessages(data.messages ?? []);
    if (opts?.scroll !== false) setTimeout(scrollToBottom, 100);
  }, []);

  const loadUsers = useCallback(async () => {
    const r = await fetch("/api/users/active", {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) return;
    const data = await r.json();
    setUsers(data.users ?? []);
  }, []);

  const loadConversationTags = useCallback(async () => {
    try {
      const r = await fetch("/api/conversation-tags", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setConversationTags(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadConversationsNow();
    loadUsers();
    loadConversationTags();
  }, [loadConversationsNow, loadUsers, loadConversationTags]);

  // Poll lista de conversaciones cada poco cuando la pestaña está visible (cercano a tiempo real)
  useEffect(() => {
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadConversations();
      }
    }, LIST_POLL_INTERVAL);
    return () => clearInterval(t);
  }, [loadConversations]);

  // Al volver a la pestaña: refrescar lista y chat actual sin recargar la página
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      loadConversations();
      if (selectedId) {
        loadMessages(selectedId);
        fetch(`/api/conversations/${selectedId}`, { credentials: "include" })
          .then(async (r) => {
            try {
              const text = await r.text();
              const data = text ? JSON.parse(text) : {};
              setAssignedTo(data.conversation?.assignedTo ?? null);
              setParticipants(data.conversation?.participants ?? []);
            } catch {
              // ignore
            }
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [loadConversations, loadMessages, selectedId]);

  // Countdown 24h: actualizar cada segundo cuando hay conversación seleccionada con último mensaje del contacto
  const selectedConv = conversations.find((c) => c.id === selectedId);
  useEffect(() => {
    if (!selectedId || !selectedConv?.lastMessageFromContactAt) return;
    const t = setInterval(() => setCountdownTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [selectedId, selectedConv?.lastMessageFromContactAt]);

  // Deep link: ?conversationId=xxx o ?tab=sin_asignar
  useEffect(() => {
    const convId = searchParams.get("conversationId");
    const tab = searchParams.get("tab");
    if (tab === "sin_asignar") setTabNivel1("sin_asignar");
    if (convId) setSelectedId(convId);
  }, [searchParams]);

  // Cuando carguen las conversaciones y tengamos conversationId en URL, seleccionar y abrir en mobile
  useEffect(() => {
    const convId = searchParams.get("conversationId");
    if (!convId || conversations.length === 0) return;
    const c = conversations.find((x) => x.id === convId);
    if (c) {
      setSelectedId(convId);
      setOtherUser(c.otherUser ?? null);
      setAssignedTo(c.assignedTo ?? null);
      setMobileShowChat(true);
    }
  }, [conversations, searchParams]);

  // Auto-seleccionar primera conversación si solo hay una (bandeja de entrada)
  useEffect(() => {
    if (conversations.length === 1 && !selectedId) {
      const c = conversations[0];
      setSelectedId(c.id);
      setOtherUser(c.otherUser ?? null);
      setAssignedTo(c.assignedTo ?? null);
      setMobileShowChat(true);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    if (selectedId && conversations.length > 0) {
      const c = conversations.find((x) => x.id === selectedId);
      if (c?.assignedTo !== undefined) setAssignedTo(c.assignedTo);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    setReplyingTo(null);
  }, [selectedId]);

  const markAsRead = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/conversations/${convId}/read`, { method: "POST", credentials: "include" });
      loadConversationsNow();
    } catch {
      // ignore
    }
  }, [loadConversationsNow]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setOtherUser(null);
      setAssignedTo(null);
      setParticipants([]);
      return;
    }
    markAsRead(selectedId);
    fetch(`/api/conversations/${selectedId}`)
      .then(async (r) => {
        try {
          const text = await r.text();
          const data = text ? JSON.parse(text) : {};
          setOtherUser(data.conversation?.otherUser ?? null);
          setAssignedTo(data.conversation?.assignedTo ?? null);
          setParticipants(data.conversation?.participants ?? []);
        } catch {
          // ignore
        }
      })
      .catch(() => {});
    loadMessages(selectedId);
  }, [selectedId, loadMessages, markAsRead]);

  const pollInterval = isPusherClientConfigured() ? POLL_INTERVAL_REALTIME : POLL_INTERVAL_FALLBACK;

  usePusherChannel(
    "conversations-updates",
    useMemo(
      () => [
        {
          event: "assignment_changed",
          handler: () => loadConversations(),
        },
      ],
      [loadConversations]
    )
  );

  usePusherChannel(
    selectedId ? `${PUSHER_CHANNEL_PREFIX}${selectedId}` : null,
    useMemo(
      () => [
        {
          event: "new_message",
          handler: (data: unknown) => {
            const m = data as MessageItem;
            if (!m?.id) return;
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              return [...prev, m];
            });
            loadConversations();
            setTimeout(scrollToBottom, 100);
          },
        },
        {
          event: "assignment_changed",
          handler: (data: unknown) => {
            const d = data as { assignedTo?: User | null };
            if (d?.assignedTo !== undefined) setAssignedTo(d.assignedTo ?? null);
            loadConversations();
          },
        },
        {
          event: "message_status",
          handler: (data: unknown) => {
            const d = data as { id: string; status: string };
            if (d?.id && d?.status) {
              setMessages((prev) =>
                prev.map((m) => (m.id === d.id ? { ...m, status: d.status } : m))
              );
            }
          },
        },
      ],
      [loadConversations]
    )
  );

  useEffect(() => {
    if (!selectedId) return;
    const t = setInterval(() => {
      loadMessages(selectedId, { scroll: false });
      loadConversationsNow();
      fetch(`/api/conversations/${selectedId}`)
        .then(async (r) => {
          try {
            const text = await r.text();
            const data = text ? JSON.parse(text) : {};
            setAssignedTo(data.conversation?.assignedTo ?? null);
            setParticipants(data.conversation?.participants ?? []);
          } catch {
            // ignore
          }
        })
        .catch(() => {});
    }, pollInterval);
    return () => clearInterval(t);
  }, [selectedId, loadMessages, loadConversationsNow, pollInterval]);

  const toggleAssignment = async () => {
    if (!selectedId || !myId) return;
    const willTake = assignedTo?.id !== myId;
    const r = await fetch(`/api/conversations/${selectedId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ take: willTake }),
      credentials: "include",
    });
    let data: { assignedTo?: User | null; error?: string } = {};
    try {
      const text = await r.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: "Error de conexión" };
    }
    if (r.ok) {
      setAssignedTo(data.assignedTo ?? null);
      loadConversationsNow();
    } else {
      alert(data.error ?? "No se pudo cambiar la asignación");
    }
  };

  const assignToUser = async (userId: string) => {
    if (!selectedId) return;
    const r = await fetch(`/api/conversations/${selectedId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignToUserId: userId }),
      credentials: "include",
    });
    let data: { assignedTo?: User | null; error?: string } = {};
    try {
      const text = await r.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: "Error de conexión" };
    }
    if (r.ok) {
      setAssignedTo(data.assignedTo ?? null);
      loadConversationsNow();
    } else {
      alert(data.error ?? "No se pudo asignar");
    }
  };

  const devolverAlBot = async () => {
    if (!selectedId) return;
    const r = await fetch(`/api/conversations/${selectedId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignToBot: true }),
      credentials: "include",
    });
    let data: { error?: string } = {};
    try {
      const text = await r.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: "Error de conexión" };
    }
    if (r.ok) {
      setAssignedTo(null);
      loadConversationsNow();
    } else {
      alert(data.error ?? "No se pudo devolver al bot");
    }
  };

  const isAdmin = myRole === "super_admin" || myRole === "admin";
  const iHaveIt = assignedTo?.id === myId;
  const someoneElseHasIt = assignedTo && assignedTo.id !== myId;
  const currentRestricted = selectedId ? conversations.find((c) => c.id === selectedId)?.restricted : false;
  const canWrite = iHaveIt && (!currentRestricted || isAdmin);
  const isBotChannel = selectedConv?.channel === "bot";
  const windowExpired =
    isBotChannel &&
    !!selectedConv?.lastMessageFromContactAt &&
    new Date(selectedConv.lastMessageFromContactAt).getTime() + WINDOW_24H_MS < Date.now();
  const canWriteDirect = canWrite && !windowExpired;

  const toggleRestrict = async () => {
    if (!selectedId) return;
    setShowChatMenu(false);
    try {
      const r = await fetch(`/api/conversations/${selectedId}/restrict`, { method: "POST", credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        const newRestricted = !!data.restricted;
        setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, restricted: newRestricted } : c)));
        if (!isAdmin && newRestricted) {
          setSelectedId(null);
          setOtherUser(null);
          setMobileShowChat(false);
        }
        loadConversationsNow();
      }
    } catch {
      // ignore
    }
  };

  const clearChat = async () => {
    if (!selectedId) return;
    setShowChatMenu(false);
    setShowClearChatConfirm(false);
    try {
      const r = await fetch(`/api/conversations/${selectedId}/clear`, { method: "DELETE", credentials: "include" });
      if (r.ok) {
        setMessages([]);
        loadConversationsNow();
      }
    } catch {
      // ignore
    }
  };

  const openContactInfo = async () => {
    if (!selectedId) return;
    setShowChatMenu(false);
    try {
      const r = await fetch(`/api/conversations/${selectedId}`, { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.conversation) {
        const conv = data.conversation;
        setConversationDetail({
          contact: conv.contact ?? { phone: otherUser?.email ?? "", name: otherUser?.name ?? null },
          messagesCount: conv.messagesCount ?? 0,
          createdAt: conv.createdAt,
        });
        setShowContactInfo(true);
      }
    } catch {
      // ignore
    }
  };

  const sendTemplate = async () => {
    if (!selectedId || !selectedTemplate || templateSending) return;
    setTemplateSending(true);
    try {
      const t = templates.find((x) => x.name === selectedTemplate);
      const lang = t?.language ?? "es";
      const displayContent = t ? buildTemplateDisplayContent(t, templateBodyParams) : "";
      const r = await fetch(`/api/conversations/${selectedId}/send-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          templateName: selectedTemplate,
          languageCode: lang,
          bodyParams: templateBodyParams,
          displayContent: displayContent || undefined,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.message?.id ?? "",
            content: data.message?.content ?? (displayContent || `[Plantilla: ${selectedTemplate}]`),
            type: "text",
            mediaUrl: null,
            mediaFilename: null,
            senderId: data.message?.sender?.id ?? myId ?? "",
            sender: data.message?.sender ?? { id: myId ?? "", email: "", name: null },
            status: "sent",
            createdAt: data.message?.createdAt ?? new Date().toISOString(),
            fromContact: false,
          },
        ]);
        scrollToBottom();
        loadConversationsNow();
        setSelectedTemplate("");
        setTemplateBodyParams([]);
      } else {
        alert(data.error ?? "Error al enviar plantilla");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setTemplateSending(false);
    }
  };

  useEffect(() => {
    if (!canWrite) {
      setShowAudioRecorder(false);
      setShowVideoRecorder(false);
      setShowPhotoCapture(false);
      setShowEmojiPicker(false);
      setShowAttachments(false);
    }
  }, [canWrite]);

  // Cargar plantillas cuando ventana cerrada (para reactivar)
  useEffect(() => {
    if (!windowExpired || !selectedId) return;
    fetch("/api/whatsapp/templates?status=APPROVED", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.templates)) setTemplates(d.templates as TemplateForPreview[]);
        else setTemplates([]);
      })
      .catch(() => setTemplates([]));
    setSelectedTemplate("");
    setTemplateBodyParams([]);
  }, [windowExpired, selectedId]);

  // Typing indicator para agentes: enviar a WhatsApp cuando el agente escribe
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!selectedId || !canWriteDirect || !input.trim()) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      return;
    }
    const sendTyping = () => {
      fetch(`/api/conversations/${selectedId}/typing`, { method: "POST", credentials: "include" }).catch(() => {});
    };
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      typingDebounceRef.current = null;
      sendTyping();
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = setInterval(sendTyping, 15000);
    }, 500);
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [input, selectedId, canWriteDirect]);


  const startConversation = async (userId: string) => {
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });
      const text = await r.text();
      let data: { conversation?: { id: string }; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // respuesta vacía o no-JSON
      }
      if (r.ok && data.conversation?.id) {
        setSelectedId(data.conversation.id);
        const u = users.find((x) => x.id === userId);
        setOtherUser(u ?? null);
        setShowNewChat(false);
        setMobileShowChat(true);
        loadConversationsNow();
        loadMessages(data.conversation.id);
      } else if (data?.error) {
        console.error("startConversation:", data.error);
      }
    } catch (e) {
      console.error("startConversation error:", e);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || !selectedId || sending || !iHaveIt || windowExpired) return;

    setSending(true);
    if (!textOverride) setInput("");
    const replyToId = replyingTo?.id;
    setReplyingTo(null);

    const r = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, ...(replyToId && { replyToMessageId: replyToId }) }),
    });

    setSending(false);

    if (r.ok) {
      const data = await r.json();
      setMessages((prev) => [...prev, { ...data.message, fromContact: false }]);
      loadConversationsNow();
    }
  };

  const VERCEL_LIMIT = 4.5 * 1024 * 1024;
  const shouldUseClientUpload = (t: AttachmentType, size: number) =>
    t === "document" || (size > VERCEL_LIMIT && ["video", "image", "audio"].includes(t));

  const sendMediaMessage = async (type: AttachmentType, file: File) => {
    if (!selectedId || sending || !iHaveIt) return;

    setSending(true);
    let fileToUpload = file;

    if (type === "video" && (file.type?.includes("webm") || file.name?.toLowerCase().endsWith(".webm"))) {
      try {
        const { convertWebmToMp4InBrowser } = await import("@/lib/convert-webm-to-mp4-browser");
        const blob = await convertWebmToMp4InBrowser(file);
        fileToUpload = new File([blob], file.name.replace(/\.webm$/i, ".mp4"), { type: "video/mp4" });
      } catch (err) {
        console.error("Error convirtiendo video:", err);
        setSending(false);
        alert("No se pudo convertir el video. Adjunta un archivo MP4.");
        return;
      }
    }

    if (type === "audio" && shouldUseClientUpload(type, file.size) && (file.type?.includes("webm") || file.name?.toLowerCase().endsWith(".webm"))) {
      try {
        const { convertWebmToOggInBrowser } = await import("@/lib/convert-webm-to-mp4-browser");
        const blob = await convertWebmToOggInBrowser(file);
        fileToUpload = new File([blob], file.name.replace(/\.webm$/i, ".ogg"), { type: "audio/ogg" });
      } catch (err) {
        console.error("Error convirtiendo audio:", err);
        setSending(false);
        alert("No se pudo convertir el audio. Usa formato OGG o MP3.");
        return;
      }
    }

    let url: string;
    if (shouldUseClientUpload(type, fileToUpload.size)) {
      try {
        const blob = await upload(fileToUpload.name, fileToUpload, {
          access: "public",
          handleUploadUrl: "/api/chat/blob-upload",
          multipart: fileToUpload.size > 4 * 1024 * 1024,
        });
        url = blob.url;
      } catch (err) {
        setSending(false);
        alert((err as Error)?.message ?? "Error al subir archivo");
        return;
      }
    } else {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("type", type);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok) {
        setSending(false);
        const err = await uploadRes.json().catch(() => ({}));
        alert(err.error ?? "Error al subir archivo");
        return;
      }

      const data = await uploadRes.json();
      url = data.url;
    }

    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    const r = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "",
        type,
        mediaUrl: url,
        mediaFilename: type === "document" ? fileToUpload.name : null,
        ...(replyToId && { replyToMessageId: replyToId }),
      }),
    });

    setSending(false);

    if (r.ok) {
      const data = await r.json();
      setMessages((prev) => [...prev, { ...data.message, fromContact: false }]);
      loadConversationsNow();
    }
  };

  const sendVoiceNote = async (blob: Blob) => {
    if (!selectedId || sending || !iHaveIt) return;

    setSending(true);
    let file: File;
    if (blob.type.includes("webm") && blob.size > VERCEL_LIMIT) {
      try {
        const { convertWebmToOggInBrowser } = await import("@/lib/convert-webm-to-mp4-browser");
        const oggBlob = await convertWebmToOggInBrowser(blob);
        file = new File([oggBlob], `nota-voz-${Date.now()}.ogg`, { type: "audio/ogg" });
      } catch (err) {
        console.error("Error convirtiendo nota de voz:", err);
        setSending(false);
        alert("No se pudo convertir el audio. Intenta de nuevo.");
        setShowAudioRecorder(false);
        return;
      }
    } else {
      const ext = blob.type.includes("webm") ? ".webm" : ".ogg";
      file = new File([blob], `nota-voz-${Date.now()}${ext}`, { type: blob.type });
    }

    let url: string;
    if (file.size > VERCEL_LIMIT) {
      try {
        const uploaded = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/chat/blob-upload",
          multipart: file.size > 4 * 1024 * 1024,
        });
        url = uploaded.url;
      } catch (err) {
        setSending(false);
        alert((err as Error)?.message ?? "Error al subir audio");
        setShowAudioRecorder(false);
        return;
      }
    } else {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "audio");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok) {
        setSending(false);
        const err = await uploadRes.json().catch(() => ({}));
        alert(err.error ?? "Error al subir audio");
        setShowAudioRecorder(false);
        return;
      }
      const data = await uploadRes.json();
      url = data.url;
    }

    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    const r = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "",
        type: "audio",
        mediaUrl: url,
        mediaFilename: null,
        ...(replyToId && { replyToMessageId: replyToId }),
      }),
    });

    setSending(false);
    setShowAudioRecorder(false);

    if (r.ok) {
      const data = await r.json();
      setMessages((prev) => [...prev, { ...data.message, fromContact: false }]);
      loadConversationsNow();
    }
  };

  const sendVideoRecording = async (blob: Blob) => {
    if (!selectedId || sending || !iHaveIt) return;

    setSending(true);
    try {
      let file: File;
      if (blob.type.includes("webm")) {
        try {
          const { convertWebmToMp4InBrowser } = await import("@/lib/convert-webm-to-mp4-browser");
          const mp4Blob = await convertWebmToMp4InBrowser(blob);
          file = new File([mp4Blob], `video-${Date.now()}.mp4`, { type: "video/mp4" });
        } catch (err) {
          console.error("Error convirtiendo video:", err);
          alert("No se pudo convertir el video. La primera vez puede tardar (descarga ~30MB). Intenta de nuevo.");
          return;
        }
      } else {
        file = new File([blob], `video-${Date.now()}.mp4`, { type: blob.type });
      }

      let url: string;
      if (file.size > VERCEL_LIMIT) {
        try {
          const uploaded = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/chat/blob-upload",
            multipart: file.size > 4 * 1024 * 1024,
          });
          url = uploaded.url;
        } catch (err) {
          alert((err as Error)?.message ?? "Error al subir video");
          return;
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "video");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          alert(err.error ?? "Error al subir video");
          return;
        }
        const data = await uploadRes.json();
        url = data.url;
      }

      const replyToId = replyingTo?.id;
      setReplyingTo(null);
      const r = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          type: "video",
          mediaUrl: url,
          mediaFilename: null,
          ...(replyToId && { replyToMessageId: replyToId }),
        }),
      });

      setShowVideoRecorder(false);

      if (r.ok) {
        const data = await r.json();
        setMessages((prev) => [...prev, { ...data.message, fromContact: false }]);
        loadConversationsNow();
      }
    } catch (err) {
      console.error("Error enviando video:", err);
      alert("Error al enviar el video. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const sendPhotoCapture = async (blob: Blob) => {
    if (!selectedId || sending || !iHaveIt) return;

    setSending(true);
    const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });

    let url: string;
    if (file.size > VERCEL_LIMIT) {
      try {
        const uploaded = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/chat/blob-upload",
          multipart: file.size > 4 * 1024 * 1024,
        });
        url = uploaded.url;
      } catch (err) {
        setSending(false);
        alert((err as Error)?.message ?? "Error al subir foto");
        setShowPhotoCapture(false);
        return;
      }
    } else {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok) {
        setSending(false);
        const err = await uploadRes.json().catch(() => ({}));
        alert(err.error ?? "Error al subir foto");
        setShowPhotoCapture(false);
        return;
      }
      const data = await uploadRes.json();
      url = data.url;
    }

    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    const r = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "",
        type: "image",
        mediaUrl: url,
        mediaFilename: null,
        ...(replyToId && { replyToMessageId: replyToId }),
      }),
    });

    setSending(false);
    setShowPhotoCapture(false);

    if (r.ok) {
      const data = await r.json();
      setMessages((prev) => [...prev, { ...data.message, fromContact: false }]);
      loadConversationsNow();
    }
  };

  const scrollToMessage = (messageId: string) => {
    const el = messageRefsMap.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-conversia-primary", "ring-offset-2");
      setTimeout(() => el.classList.remove("ring-2", "ring-conversia-primary", "ring-offset-2"), 1500);
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = inputRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const v = input;
      const next = v.slice(0, start) + emoji + v.slice(end);
      setInput(next);
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
      }, 0);
    } else {
      setInput((prev) => prev + emoji);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!iHaveIt) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        setMyId(u?.id ?? null);
        setMyUser(u ? { id: u.id, name: u.name ?? null, email: u.email } : null);
        setMyRole(u?.role ?? "colaborador");
      })
      .catch(() => {});
  }, []);

  const isFromClient = (msg: MessageItem) => msg.fromContact === true;

  // Una etiqueta por conversación: bot | sin asignar | asignado (asistidas)
  const filteredConversations = useMemo(() => {
    let list = conversations;
    const isCustomTag = tabNivel1 && !["todas", "bot", "sin_asignar", "asistidas", "restringidos"].includes(tabNivel1);
    if (tabNivel1 === "bot") {
      list = list.filter((c) => c.channel === "bot" && !c.handoffRequestedAt && !c.assignedTo);
    } else if (tabNivel1 === "sin_asignar") {
      list = list.filter((c) => !!c.handoffRequestedAt && !c.assignedTo);
    } else if (tabNivel1 === "asistidas") {
      list = list.filter((c) => !!c.assignedTo);
    } else if (tabNivel1 === "restringidos") {
      list = list.filter((c) => c.restricted);
    } else if (isCustomTag) {
      list = list.filter((c) => c.conversationTag?.id === tabNivel1);
    }
    if (tabNivel2) {
      list = list.filter((c) => c.assignedTo?.id === tabNivel2);
    }
    // Búsqueda estilo WhatsApp: nombre, número/teléfono, palabras en último mensaje
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      list = list.filter((c) => {
        const name = (c.otherUser?.name ?? "").toLowerCase();
        const phone = (c.otherUser?.email ?? "").toLowerCase();
        const lastContent = (c.lastMessage?.content ?? "").toLowerCase();
        const assigneeName = (c.assignedTo?.name ?? c.assignedTo?.email ?? "").toLowerCase();
        return terms.every((t) =>
          name.includes(t) ||
          phone.includes(t) ||
          lastContent.includes(t) ||
          assigneeName.includes(t)
        );
      });
    }
    return list;
  }, [conversations, tabNivel1, tabNivel2, searchQuery]);

  const assignees = useMemo(() => {
    const seen = new Set<string>();
    const out: User[] = [];
    for (const c of conversations) {
      if (c.assignedTo && !seen.has(c.assignedTo.id)) {
        seen.add(c.assignedTo.id);
        out.push(c.assignedTo);
      }
    }
    out.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    return out;
  }, [conversations]);

  const assignableUsers = useMemo(() => {
    const admin = myRole === "super_admin" || myRole === "admin";
    if (!admin) return participants;
    const byId = new Map<string, User>();
    for (const u of users) byId.set(u.id, u);
    if (myUser && !byId.has(myUser.id)) byId.set(myUser.id, myUser);
    const list = Array.from(byId.values()).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    return list;
  }, [myRole, users, myUser, participants]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-conversia-primary border-t-transparent" />
          <p className="text-sm text-[#667781]">Cargando conversaciones…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[400px] flex-col overflow-hidden bg-white">
      {/* Barra: Bandeja de entrada + + (sin cambiar) */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-[#E9EDEF] bg-[#F0F2F5] px-4 py-3">
        <h2 className="text-lg font-medium text-[#111B21]">Bandeja de entrada</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowNewChat((s) => !s)}
            className="rounded-full p-2 text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
            title="Nueva conversación (solo admin)"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Fila única: ancho de las etiquetas = ancho de la lista de conversaciones; ancho derecho = área de chat */}
      <div className="flex shrink-0 items-stretch border-b border-[#E9EDEF] bg-white">
        <div
          className={`min-w-0 flex-wrap items-center gap-1 border-r border-[#E9EDEF] bg-[#F0F2F5] px-2 py-2 md:w-[380px] md:shrink-0 ${
            mobileShowChat ? "hidden md:flex" : "flex w-full"
          }`}
        >
          {[
            { id: "todas", label: "Todas" },
            { id: "bot", label: "Bot" },
            { id: "sin_asignar", label: "Sin Asignar" },
            { id: "asistidas", label: "Asistidas" },
            ...(isAdmin ? [{ id: "restringidos", label: "Restringidos" }] : []),
            ...conversationTags.filter((t) => !t.isSystem).map((t) => ({ id: t.id, label: t.name })),
          ].map(({ id, label }) => {
            const count =
              id === "restringidos"
                ? conversations.filter((c) => c.restricted).length
                : id === "todas" || id === "bot" || id === "sin_asignar" || id === "asistidas"
                  ? unreadByTab[id as keyof UnreadByTab] ?? 0
                  : conversations.filter((c) => c.conversationTag?.id === id && (c.unreadCount ?? 0) > 0).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTabNivel1(id);
                  if (["sin_asignar", "bot", "restringidos"].includes(id) || !["todas", "asistidas"].includes(id)) setTabNivel2(null);
                }}
                className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  tabNivel1 === id ? "bg-conversia-primary text-white" : "bg-white text-[#111B21] hover:bg-[#E9EDEF]"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
          {(["todas", "asistidas"].includes(tabNivel1) || conversationTags.some((t) => t.id === tabNivel1)) && assignees.length > 0 && (
            <>
              <span className="w-px self-stretch bg-[#E9EDEF]" aria-hidden />
              <button
                type="button"
                onClick={() => setTabNivel2(null)}
                className={`rounded-full px-2.5 py-1 text-xs transition ${
                  !tabNivel2 ? "bg-conversia-primary text-white" : "bg-[#E9EDEF] text-[#667781] hover:bg-[#D1D7DB]"
                }`}
              >
                Todos
              </button>
              {assignees.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setTabNivel2(tabNivel2 === u.id ? null : u.id)}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${
                    tabNivel2 === u.id ? "bg-conversia-primary text-white" : "bg-[#E9EDEF] text-[#667781] hover:bg-[#D1D7DB]"
                  }`}
                >
                  {u.id === myId ? "Tú" : u.name || u.email}
                </button>
              ))}
            </>
          )}
        </div>
        <div
          className={`flex min-w-0 flex-1 items-center gap-3 bg-[#F0F2F5] px-3 py-2 ${
            mobileShowChat ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedId && otherUser ? (
            <>
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                className="rounded-full p-2 text-[#111B21] hover:bg-[#E9EDEF] md:hidden shrink-0"
                aria-label="Volver"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-conversia-primary text-sm font-medium text-white">
                {getInitials(otherUser.name, otherUser.email)}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p className="truncate font-medium text-[#111B21]">{otherUser.name || otherUser.email}</p>
                <p className="truncate text-xs text-[#667781]">{otherUser.email}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {(() => {
                  const lastAt = selectedConv?.lastMessageFromContactAt;
                  if (!lastAt) return null;
                  const end = new Date(lastAt).getTime() + WINDOW_24H_MS;
                  const expired = Date.now() >= end;
                  const displayValue = expired
                    ? get24hWindowElapsed(lastAt)
                    : get24hWindowRemaining(lastAt);
                  if (!displayValue) return null;
                  return (
                    <div
                      className="shrink-0 rounded-lg border border-[#E9EDEF] bg-[#FAFBFC] px-2.5 py-1.5 text-center"
                      title={
                        expired
                          ? "Ventana cerrada. Envía una plantilla para reactivar la conversación."
                          : "Tiempo restante para mantener contacto directo (política WhatsApp 24h)"
                      }
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[#667781]">
                        {expired ? "Ventana cerrada hace" : "Contacto directo"}
                      </p>
                      <p className={`font-mono text-sm font-bold ${expired ? "text-amber-600" : "text-red-600"}`}>
                        {displayValue}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#667781]">
                        Último mensaje: {formatLastMessageFullDate(lastAt)}
                      </p>
                    </div>
                  );
                })()}
                {isAdmin && assignableUsers.length > 0 && (
                  <select
                    value={assignedTo?.id ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__bot__") devolverAlBot();
                      else if (v) assignToUser(v);
                      else if (selectedId) {
                        fetch(`/api/conversations/${selectedId}/assign`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ take: false }),
                          credentials: "include",
                        }).then(async (r) => {
                          const d = r.ok ? await r.json() : {};
                          setAssignedTo(d.assignedTo ?? null);
                          loadConversationsNow();
                        });
                      }
                    }}
                    className="rounded border border-[#E9EDEF] bg-white px-2 py-1 text-xs text-[#111B21]"
                  >
                    <option value="">Sin asignar</option>
                    {conversations.find((c) => c.id === selectedId)?.channel === "bot" &&
                      (conversations.find((c) => c.id === selectedId)?.handoffRequestedAt || assignedTo) && (
                      <option value="__bot__">Devolver al bot</option>
                    )}
                    {assignableUsers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id === myId ? "Tú" : p.name || p.email}
                      </option>
                    ))}
                  </select>
                  )}
                <label className="flex cursor-pointer items-center gap-2 shrink-0">
                  <span className="text-xs text-[#667781]">
                    {iHaveIt
                      ? "Tú la tienes"
                      : someoneElseHasIt
                        ? `Asignada a ${assignedTo?.name || assignedTo?.email}`
                        : "Tomar conversación"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={iHaveIt}
                    disabled={!!(someoneElseHasIt && !isAdmin)}
                    onClick={toggleAssignment}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-conversia-primary focus:ring-offset-2 ${
                      iHaveIt ? "bg-conversia-primary" : "bg-gray-300"
                    } ${someoneElseHasIt && !isAdmin ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        iHaveIt ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
                <div className="relative shrink-0" ref={chatMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowChatMenu((s) => !s)}
                    className="rounded-full p-2 text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
                    aria-label="Más opciones"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                  {showChatMenu && (
                    <>
                      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setShowChatMenu(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-[#E9EDEF] bg-white py-1 shadow-lg">
                        {conversationTags.length > 0 && (
                          <div className="border-b border-[#E9EDEF] px-3 py-2">
                            <span className="text-xs font-medium text-[#667781]">Mover a etiqueta</span>
                            <select
                              className="mt-1 w-full rounded border border-[#E9EDEF] px-2 py-1 text-xs"
                              value={(() => {
                                const c = conversations.find((x) => x.id === selectedId);
                                if (!c) return "";
                                if (c.conversationTag?.id) return c.conversationTag.id;
                                const botTag = conversationTags.find((t) => t.slug === "bot");
                                const sinTag = conversationTags.find((t) => t.slug === "sin_asignar");
                                const asisTag = conversationTags.find((t) => t.slug === "asistidas");
                                if (c.channel === "bot" && !c.handoffRequestedAt && !c.assignedTo) return botTag?.id ?? "";
                                if (c.handoffRequestedAt && !c.assignedTo) return sinTag?.id ?? "";
                                if (c.assignedTo) return asisTag?.id ?? "";
                                return "";
                              })()}
                              onChange={async (e) => {
                                const tagId = e.target.value;
                                if (!tagId || !selectedId) return;
                                setShowChatMenu(false);
                                try {
                                  const asistidasTag = conversationTags.find((t) => t.slug === "asistidas");
                                  const body: { tagId: string; assignToUserId?: string } = { tagId };
                                  if (tagId === asistidasTag?.id && myId) body.assignToUserId = myId;
                                  const r = await fetch(`/api/conversations/${selectedId}/tag`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(body),
                                  });
                                  if (r.ok) {
                                    loadConversationsNow();
                                    if (body.assignToUserId) setAssignedTo(users.find((u) => u.id === body.assignToUserId) ?? null);
                                  }
                                } catch {
                                  // ignore
                                }
                              }}
                            >
                              <option value="">—</option>
                              {conversationTags.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <button type="button" onClick={openContactInfo} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111B21] hover:bg-[#F0F2F5]">
                          <svg className="h-5 w-5 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /></svg>
                          Info. del contacto
                        </button>
                        <button type="button" onClick={toggleRestrict} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111B21] hover:bg-[#F0F2F5]">
                          <svg className="h-5 w-5 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          {conversations.find((c) => c.id === selectedId)?.restricted ? "Desrestringir chat" : "Restringir chat"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowChatMenu(false); setShowClearChatConfirm(true); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111B21] hover:bg-[#F0F2F5]"
                        >
                          <svg className="h-5 w-5 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Vaciar chat
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setShowChatMenu(false);
                            setShowDeleteChatConfirm(true);
                          }}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Eliminar chat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#667781] truncate">Selecciona una conversación</p>
          )}
        </div>
      </div>

      {/* Lista de chats y área de chat */}
      <div className="flex min-h-0 flex-1">
        <div
          className={`flex w-full flex-col border-r border-gray-200 bg-[#F0F2F5] md:w-[380px] ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Buscador estilo WhatsApp - mismo ancho que etiquetas y lista */}
          <div className="shrink-0 border-b border-[#E9EDEF] bg-white px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#F0F2F5] px-3 py-2">
              <svg className="h-5 w-5 shrink-0 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversaciones"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#111B21] placeholder:text-[#667781] focus:outline-none"
                aria-label="Buscar por nombre, número o palabras"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 rounded-full p-1 text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
                  aria-label="Limpiar búsqueda"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-conversia-primary/20">
                <svg className="h-8 w-8 text-conversia-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="mb-1 font-medium text-[#111B21]">
                {searchQuery.trim() ? "No hay resultados" : "Sin conversaciones aún"}
              </p>
              <p className="max-w-[280px] text-sm text-[#667781]">
                {searchQuery.trim()
                  ? `Ninguna conversación coincide con "${searchQuery.trim().slice(0, 30)}${searchQuery.trim().length > 30 ? "…" : ""}". Prueba con otro término.`
                  : tabNivel1 !== "todas"
                    ? "Prueba la pestaña Todas para ver todas las conversaciones. Si sigue vacío, actualiza la página (F5)."
                    : "Los contactos que te escriban aparecerán aquí. Si no ves nada, actualiza la página (F5)."}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const other = c.otherUser;
              const isSelected = selectedId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.id);
                    setAssignedTo(c.assignedTo ?? null);
                    setMobileShowChat(true);
                    // Optimista solo cuando hay mensajes sin leer; si handoff pendiente, la conv sigue contando
                    const hasUnreadMsgs = (c.unreadCount ?? 0) > 0;
                    const hasHandoff = !!c.handoffPending;
                    if (hasUnreadMsgs) {
                      setConversations((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, unread: hasHandoff, unreadCount: 0 } : x
                        )
                      );
                      if (!hasHandoff) {
                        const isBotTab = c.channel === "bot" && !c.handoffRequestedAt && !c.assignedTo;
                        const isSinAsignarTab = !!c.handoffRequestedAt && !c.assignedTo;
                        const isAsistidasTab = !!c.assignedTo;
                        setUnreadByTab((prev) => ({
                          ...prev,
                          todas: Math.max(0, prev.todas - 1),
                          bot: isBotTab ? Math.max(0, prev.bot - 1) : prev.bot,
                          sin_asignar: isSinAsignarTab ? Math.max(0, prev.sin_asignar - 1) : prev.sin_asignar,
                          asistidas: isAsistidasTab ? Math.max(0, prev.asistidas - 1) : prev.asistidas,
                        }));
                      }
                    }
                  }}
                  className={`flex w-full items-center gap-3 border-b border-[#E9EDEF] px-4 py-3 transition ${
                    isSelected ? "bg-[#E9EDEF]" : "hover:bg-[#F0F2F5]"
                  }`}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-conversia-primary text-base font-medium text-white">
                    {other ? getInitials(other.name, other.email) : "?"}
                    {(c.unreadCount ?? 0) > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount! > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                    {c.handoffPending && (c.unreadCount ?? 0) === 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-500" title="Handoff pendiente" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p
                      className={`truncate ${c.unread ? "font-bold" : "font-medium"} text-[#111B21]`}
                    >
                      {other?.name || other?.email || "Chat"}
                    </p>
                    <p className="truncate text-sm text-[#667781]">
                      {c.lastMessage?.content || "Sin mensajes"}
                    </p>
                    {c.assignedTo && (
                      <p className="truncate text-[10px] text-conversia-primary">
                        {c.assignedTo.id === myId ? "● Tú la tienes" : `● ${c.assignedTo.name || c.assignedTo.email}`}
                      </p>
                    )}
                  </div>
                  {c.lastMessage && (
                    <span className="shrink-0 text-xs text-[#667781]">{formatTime(c.lastMessage.createdAt)}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Área de chat */}
      <div
        className={`flex flex-1 flex-col bg-[#ECE5DD] ${
          mobileShowChat ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedId && otherUser ? (
          <>
            {/* Mensajes */}
            <div
              className="flex-1 overflow-y-auto bg-[#ECE5DD] bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M30%2020c-5.5%200-10%204.5-10%2010s4.5%2010%2010%2010%2010-4.5%2010-10-4.5-10-10-10zm0%2017c-3.9%200-7-3.1-7-7s3.1-7%207-7%207%203.1%207%207-3.1%207-7%207z%22%20fill%3D%22%23d4d4d4%22%20opacity%3D%220.3%22%2F%3E%3C%2Fsvg%3E')] p-4"
              style={{ backgroundSize: "60px 60px" }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  ref={(el) => {
                    if (el) messageRefsMap.current.set(m.id, el);
                  }}
                  className={`group relative mb-2 flex ${isFromClient(m) ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 shadow-md ${
                      isFromClient(m)
                        ? "rounded-tl-none bg-white text-[#111B21]"
                        : "rounded-tr-none bg-[#D9FDD3] text-[#111B21]"
                    }`}
                  >
                    {m.replyTo && (
                      <button
                        type="button"
                        onClick={() => scrollToMessage(m.replyTo!.id)}
                        className="mb-1.5 block w-full cursor-pointer rounded border-l-2 border-conversia-primary bg-[#F0F2F5]/60 px-2 py-1 text-left text-xs text-[#667781] transition hover:bg-[#E9EDEF]"
                      >
                        <span className="font-medium text-[#111B21]">
                          {m.replyTo.fromContact ? (otherUser?.name || otherUser?.email || "Contacto") : (m.replyTo.sender?.name || m.replyTo.sender?.email || "Tú")}
                        </span>
                        <p className="mt-0.5 truncate">{m.replyTo.type !== "text" ? `[${m.replyTo.type}]` : m.replyTo.content}</p>
                      </button>
                    )}
                    {["image", "video", "audio", "document", "sticker"].includes(m.type || "") && m.mediaUrl && (
                      <MediaViewer
                        type={m.type as "image" | "video" | "audio" | "document" | "sticker"}
                        url={m.mediaUrl}
                        filename={m.mediaFilename}
                        isSent={!isFromClient(m)}
                      />
                    )}
                    {m.content && (
                      <div className={m.content.includes("— ") ? "border-l-2 border-conversia-primary pl-2" : ""}>
                        <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                      </div>
                    )}
                    <div className={`mt-1 flex items-center gap-1 ${isFromClient(m) ? "justify-start" : "justify-end"}`}>
                      <span className="text-[10px] text-[#667781]">{formatTime(m.createdAt)}</span>
                      {!isFromClient(m) && (
                        <span className={`flex ${m.status === "read" ? "text-[#53BDEB]" : "text-[#667781]"}`} title={m.status === "read" ? "Leído" : m.status === "delivered" ? "Entregado" : "Enviado"}>
                          {m.status === "delivered" || m.status === "read" ? (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm-4.24-2.83L6.58 11.59 5.17 10.18 3.59 11.76l2.41 2.41 6.76-6.76-1.42-1.42z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {canWriteDirect && (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(m)}
                      className="absolute -bottom-1 left-0 rounded-full bg-white p-1.5 shadow-md opacity-100 transition hover:bg-[#E9EDEF] md:opacity-0 md:group-hover:opacity-100"
                      title="Responder"
                      aria-label="Responder a este mensaje"
                    >
                      <svg className="h-4 w-4 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - estilo WhatsApp */}
            <div className={`relative flex border-t border-[#E9EDEF] bg-[#F0F2F5] p-3 ${windowExpired ? "min-h-0 flex-1 flex-col items-stretch overflow-hidden" : "items-end gap-2"}`}>
              {!canWrite ? (
                <div className="flex flex-1 items-center justify-center py-3">
                  <p className="text-center text-sm text-[#667781]">
                    Toma la conversación para poder escribir, adjuntar archivos o enviar audios y videos.
                  </p>
                </div>
              ) : windowExpired ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                  <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                    <p className="font-medium">No puedes enviar mensajes directos</p>
                    <p className="mt-0.5 text-amber-800">
                      Envía una plantilla para reactivar. Cuando el cliente responda, la ventana se abrirá.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#667781]">
                      Selecciona una plantilla
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        const name = e.target.value;
                        setSelectedTemplate(name);
                        const t = templates.find((x) => x.name === name);
                        if (t) {
                          const bodyComp = (t.components as { type?: string; text?: string }[] | undefined)?.find(
                            (c) => c.type === "BODY"
                          );
                          const text = bodyComp?.text ?? "";
                          const count = (text.match(/\{\{\d+\}\}/g) || []).length;
                          setTemplateBodyParams(Array(count).fill(""));
                        }
                      }}
                      className="w-full rounded-lg border border-[#E9EDEF] bg-white px-3 py-2.5 text-sm text-[#111B21] focus:border-conversia-primary focus:outline-none focus:ring-1 focus:ring-conversia-primary"
                    >
                      <option value="">Elige una plantilla…</option>
                      {templates.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.language})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedTemplate && (() => {
                    const t = templates.find((x) => x.name === selectedTemplate);
                    if (!t) return null;
                    return (
                    <div className="shrink-0 space-y-3 rounded-lg border border-[#E9EDEF] bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-[#667781]">
                          Vista previa
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedTemplate("")}
                          className="text-xs text-[#667781] hover:text-[#111B21]"
                        >
                          Cambiar
                        </button>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        <TemplatePreview template={t} bodyParams={templateBodyParams} />
                      </div>
                      {templateBodyParams.length > 0 && (
                        <div className="flex flex-wrap gap-2 border-t border-[#E9EDEF] pt-3">
                          {templateBodyParams.map((_, i) => (
                            <div key={i} className="min-w-[120px]">
                              <label className="mb-1 block text-xs font-medium text-[#667781]">Variable {i + 1}</label>
                              <input
                                type="text"
                                value={templateBodyParams[i] ?? ""}
                                onChange={(e) => {
                                  const next = [...templateBodyParams];
                                  next[i] = e.target.value;
                                  setTemplateBodyParams(next);
                                }}
                                placeholder={`Valor {{${i + 1}}}`}
                                className="w-full rounded-lg border border-[#E9EDEF] bg-white px-3 py-2 text-sm text-[#111B21]"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={sendTemplate}
                        disabled={templateSending}
                        className="w-full rounded-lg bg-conversia-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-conversia-primary-hover disabled:opacity-50"
                      >
                        {templateSending ? "Enviando…" : "Enviar plantilla"}
                      </button>
                    </div>
                    );
                  })()}
                </div>
              ) : showAudioRecorder ? (
                <div className="flex-1">
                  <AudioRecorder
                    onSend={sendVoiceNote}
                    onCancel={() => setShowAudioRecorder(false)}
                  />
                </div>
              ) : showVideoRecorder ? (
                <div className="flex-1">
                  <VideoRecorder
                    onSend={sendVideoRecording}
                    onCancel={() => setShowVideoRecorder(false)}
                    sending={sending}
                  />
                </div>
              ) : showPhotoCapture ? (
                <div className="flex-1">
                  <PhotoCapture
                    onSend={sendPhotoCapture}
                    onCancel={() => setShowPhotoCapture(false)}
                  />
                </div>
              ) : (
              <>
              {showAttachments && canWriteDirect && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachments(false)} aria-hidden="true" />
                  <div className="absolute bottom-full left-4 z-50">
                    <AttachmentsMenu
                      onSelect={(type, file) => sendMediaMessage(type, file)}
                      onRecordVoice={() => { setShowAttachments(false); setShowAudioRecorder(true); }}
                      onTakePhoto={() => { setShowAttachments(false); setShowPhotoCapture(true); }}
                      onClose={() => setShowAttachments(false)}
                      anchorRef={attachBtnRef}
                    />
                  </div>
                </>
              )}
              {showEmojiPicker && canWriteDirect && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} aria-hidden="true" />
                </>
              )}
              <button
                ref={attachBtnRef}
                type="button"
                disabled={!canWriteDirect}
                onClick={() => { setShowEmojiPicker(false); setShowAttachments((s) => !s); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21] disabled:cursor-not-allowed disabled:opacity-50"
                title="Adjuntar"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <div className="flex min-h-[44px] flex-1 flex-col rounded-2xl bg-white px-4 py-2 shadow-sm">
                {replyingTo && (
                  <div className="mb-1 flex items-center justify-between border-l-2 border-conversia-primary bg-[#F0F2F5]/60 pl-2">
                    <p className="truncate text-xs text-[#667781]">
                      Respondiendo a {replyingTo.fromContact ? (otherUser?.name || otherUser?.email) : "ti mismo"}: {replyingTo.type !== "text" ? `[${replyingTo.type}]` : replyingTo.content.slice(0, 50)}
                      {replyingTo.content.length > 50 ? "…" : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="shrink-0 p-1 text-[#667781] hover:text-[#111B21]"
                      aria-label="Cancelar respuesta"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => canWriteDirect && setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={replyingTo ? "Escribe tu respuesta…" : "Escribe un mensaje"}
                  rows={1}
                  disabled={!canWriteDirect}
                  readOnly={!canWrite}
                  className="max-h-32 w-full resize-none bg-transparent text-sm text-[#111B21] outline-none placeholder:text-[#667781] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
              <button
                type="button"
                disabled={!canWriteDirect}
                onClick={() => { setShowVideoRecorder(false); setShowEmojiPicker(false); setShowAttachments(false); setShowAudioRecorder(true); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21] disabled:cursor-not-allowed disabled:opacity-50"
                title="Grabar audio"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!canWriteDirect}
                onClick={() => { setShowAudioRecorder(false); setShowEmojiPicker(false); setShowAttachments(false); setShowVideoRecorder(true); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21] disabled:cursor-not-allowed disabled:opacity-50"
                title="Grabar video"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={!canWriteDirect}
                onClick={() => { setShowAudioRecorder(false); setShowVideoRecorder(false); setShowEmojiPicker(false); setShowAttachments(false); setShowPhotoCapture(true); }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21] disabled:cursor-not-allowed disabled:opacity-50"
                title="Tomar foto"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4M14 9h4" />
                </svg>
              </button>
              <div className="relative">
                {showEmojiPicker && canWriteDirect && (
                  <div className="absolute bottom-full right-0 z-50 mb-2">
                    <EmojiPicker
                      onSelect={(emoji) => { insertEmoji(emoji); }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
                <button
                  ref={emojiBtnRef}
                  type="button"
                  disabled={!canWriteDirect}
                  onClick={() => { setShowAttachments(false); setShowEmojiPicker((s) => !s); }}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21] disabled:cursor-not-allowed disabled:opacity-50 ${showEmojiPicker ? "bg-[#E9EDEF]" : ""}`}
                  title="Emoji"
                >
                  <span className="text-xl">😊</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending || !canWriteDirect}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-conversia-primary text-white disabled:opacity-50 hover:bg-conversia-primary-hover disabled:hover:bg-conversia-primary disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
              </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-[#ECE5DD] p-8 text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-conversia-primary/10">
              <svg className="h-12 w-12 text-conversia-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="mb-1 text-lg font-medium text-[#111B21]">Conversia Chat</p>
            <p className="max-w-sm text-sm text-[#667781]">
              Selecciona una conversación o inicia una nueva tocando el botón + en la lista.
            </p>
          </div>
        )}
      </div>
      </div>

      {/* Modal: Confirmar eliminar chat */}
      {showDeleteChatConfirm && selectedId && otherUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteChatConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#111B21]">
              ¿Eliminar el chat con {otherUser.name || otherUser.email}?
            </h3>
            <p className="mb-6 text-sm text-[#667781]">
              Se eliminará la conversación y todos los mensajes de tu bandeja. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteChatConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-conversia-primary hover:underline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedId) return;
                  try {
                    const r = await fetch(`/api/conversations/${selectedId}`, {
                      method: "DELETE",
                      credentials: "include",
                    });
                    if (r.ok) {
                      setShowDeleteChatConfirm(false);
                      setSelectedId(null);
                      setOtherUser(null);
                      setMessages([]);
                      loadConversationsNow();
                      setMobileShowChat(false);
                    }
                  } catch {
                    // ignore
                  }
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar vaciar chat */}
      {showClearChatConfirm && selectedId && otherUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowClearChatConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[#111B21]">
              ¿Vaciar el chat con {otherUser.name || otherUser.email}?
            </h3>
            <p className="mb-6 text-sm text-[#667781]">
              Se eliminarán todos los mensajes de tu vista. El historial en WhatsApp del contacto no se modifica.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearChatConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-conversia-primary hover:underline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Info. del contacto */}
      {showContactInfo && conversationDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowContactInfo(false); setConversationDetail(null); }}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-[#111B21]">Información del contacto</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[#667781]">Teléfono / ID</dt>
                <dd className="font-medium text-[#111B21]">{conversationDetail.contact?.phone || otherUser?.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#667781]">Nombre</dt>
                <dd className="font-medium text-[#111B21]">{conversationDetail.contact?.name || otherUser?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#667781]">Mensajes en la conversación</dt>
                <dd className="font-medium text-[#111B21]">{conversationDetail.messagesCount ?? 0}</dd>
              </div>
              {conversationDetail.createdAt && (
                <div>
                  <dt className="text-[#667781]">Primera conversación</dt>
                  <dd className="font-medium text-[#111B21]">
                    {new Date(conversationDetail.createdAt).toLocaleDateString("es", { dateStyle: "medium" })}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowContactInfo(false); setConversationDetail(null); }}
                className="rounded-lg bg-conversia-primary px-4 py-2 text-sm font-medium text-white hover:bg-conversia-primary-hover"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Iniciar chat con */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNewChat(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-[#111B21]">Iniciar chat con</h3>
              <button
                type="button"
                onClick={() => setShowNewChat(false)}
                className="rounded-lg p-2 text-[#667781] hover:bg-gray-100 hover:text-[#111B21]"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {users.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#667781]">No hay otros usuarios activos</p>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => startConversation(u.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 hover:bg-[#F0F2F5] transition"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-conversia-primary text-base font-medium text-white">
                      {getInitials(u.name, u.email)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium text-[#111B21]">{u.name || u.email}</p>
                      <p className="truncate text-sm text-[#667781]">{u.email}</p>
                    </div>
                    <svg className="h-5 w-5 shrink-0 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

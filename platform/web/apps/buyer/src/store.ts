import { create } from "zustand";
import type { MMLProduct } from "@mml/ui";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: MMLProduct[];
  error?: boolean;
}

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  status: "idle" | "streaming";
  send: (text: string) => Promise<void>;
}

const SESSION_KEY = "mml_chat_session";

let counter = 0;
const nextId = () => `m${Date.now()}_${counter++}`;

export const useChat = create<ChatState>((set, get) => ({
  sessionId: localStorage.getItem(SESSION_KEY),
  messages: [],
  status: "idle",

  async send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || get().status === "streaming") return;

    const assistantId = nextId();
    set((s) => ({
      status: "streaming",
      messages: [
        ...s.messages,
        { id: nextId(), role: "user", text: trimmed },
        { id: assistantId, role: "assistant", text: "" },
      ],
    }));

    const patchAssistant = (patch: (m: ChatMessage) => ChatMessage) =>
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantId ? patch(m) : m)),
      }));

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: get().sessionId ?? undefined,
          message: trimmed,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`chat http ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE-кадры разделены пустой строкой
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          let event = "message";
          let data = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (!data) continue;

          switch (event) {
            case "meta": {
              const { session_id } = JSON.parse(data) as { session_id: string };
              localStorage.setItem(SESSION_KEY, session_id);
              set({ sessionId: session_id });
              break;
            }
            case "delta": {
              const { text: chunk } = JSON.parse(data) as { text: string };
              patchAssistant((m) => ({ ...m, text: m.text + chunk }));
              break;
            }
            case "products": {
              const { items } = JSON.parse(data) as { items: MMLProduct[] };
              patchAssistant((m) => ({
                ...m,
                products: [...(m.products ?? []), ...items],
              }));
              break;
            }
            case "error": {
              const { message } = JSON.parse(data) as { message: string };
              patchAssistant((m) => ({
                ...m,
                text: m.text || message,
                error: true,
              }));
              break;
            }
          }
        }
      }
    } catch {
      patchAssistant((m) => ({
        ...m,
        text: m.text || "Соединение прервалось. Попробуйте ещё раз.",
        error: true,
      }));
    } finally {
      set({ status: "idle" });
    }
  },
}));

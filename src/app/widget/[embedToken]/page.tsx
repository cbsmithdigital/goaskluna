"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useConversation } from "@elevenlabs/react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WidgetConfig {
  agent: {
    name: string;
    greetingMessage: string | null;
    language: string;
    isPublic: boolean;
  };
  config: Record<string, unknown>;
  requireAuth: boolean;
  type: string;
}

type WidgetState = "loading" | "idle" | "connecting" | "active" | "ended" | "error";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Widget Page
// ---------------------------------------------------------------------------

export default function WidgetPage() {
  const { embedToken } = useParams<{ embedToken: string }>();

  // ── State ───────────────────────────────────────────────────────────────
  const [widgetState, setWidgetState] = useState<WidgetState>("loading");
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const stateRef = useRef<WidgetState>("loading");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = widgetState;
  }, [widgetState]);

  // ── ElevenLabs Conversation Hook ────────────────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      setWidgetState("active");
      if (widgetConfig?.agent.greetingMessage) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent",
            content: widgetConfig.agent.greetingMessage!,
            timestamp: new Date(),
          },
        ]);
      }
    },
    onDisconnect: () => {
      if (stateRef.current === "active") {
        setWidgetState("ended");
      }
    },
    onMessage: (message) => {
      setMessages((prev) => [
        ...prev,
        {
          role: message.source === "ai" ? "agent" : "user",
          content: message.message,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (err) => {
      setError(typeof err === "string" ? err : "Connection error occurred");
      setWidgetState("idle");
    },
  });

  // ── Fetch widget config on mount ────────────────────────────────────────
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/widget/${embedToken}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Deployment not found");
        }
        const data: WidgetConfig = await res.json();
        setWidgetConfig(data);
        setWidgetState("idle");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load widget configuration",
        );
        setWidgetState("error");
      }
    }
    fetchConfig();
  }, [embedToken]);

  // ── Start conversation ──────────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    try {
      setWidgetState("connecting");
      setError(null);
      setMessages([]);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from widget API (public, no auth required)
      const res = await fetch(`/api/widget/${embedToken}/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to start conversation");
      }

      const data = await res.json();

      // Start ElevenLabs session
      await conversation.startSession({ signedUrl: data.signedUrl });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation",
      );
      setWidgetState("idle");
    }
  }, [embedToken, conversation]);

  // ── End conversation ────────────────────────────────────────────────────
  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // Session may already be closed
    }
    setWidgetState("ended");
  }, [conversation]);

  // ── Toggle mute ─────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (isMuted) {
      conversation.setVolume({ volume: 1 });
    } else {
      conversation.setVolume({ volume: 0 });
    }
    setIsMuted((prev) => !prev);
  }, [isMuted, conversation]);

  // ── Reset to idle ───────────────────────────────────────────────────────
  const resetToIdle = useCallback(() => {
    setWidgetState("idle");
    setMessages([]);
    setError(null);
  }, []);

  // ── Auto-scroll transcript ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Format time ─────────────────────────────────────────────────────────
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Loading state ───────────────────────────────────────────────────────
  if (widgetState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-10 w-10 rounded-full border-2 border-transparent border-t-indigo-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-sm text-gray-500">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // ── Fatal error state ───────────────────────────────────────────────────
  if (widgetState === "error" && !widgetConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Unable to load widget</p>
          <p className="mt-1 text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const agentName = widgetConfig?.agent.name ?? "Agent";
  const isSpeaking = conversation.isSpeaking;

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col items-center justify-between bg-white p-4">
      {/* Agent name + status */}
      <div className="pt-2 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{agentName}</h1>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {widgetState === "active" && (
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <p className="text-xs text-gray-500">
            {widgetState === "idle" && "Ready to start"}
            {widgetState === "connecting" && "Connecting..."}
            {widgetState === "active" &&
              (isSpeaking ? "Agent is speaking..." : "Listening...")}
            {widgetState === "ended" && "Conversation ended"}
          </p>
        </div>
      </div>

      {/* ── The Orb ─────────────────────────────────────────────────────── */}
      <div className="relative flex h-48 items-center justify-center">
        {/* Expanding ring waves when speaking */}
        {widgetState === "active" && isSpeaking && (
          <>
            <motion.div
              className="absolute rounded-full border-2 border-indigo-300/30"
              initial={{ width: 128, height: 128, opacity: 0.6 }}
              animate={{ width: 224, height: 224, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <motion.div
              className="absolute rounded-full border-2 border-indigo-300/20"
              initial={{ width: 128, height: 128, opacity: 0.5 }}
              animate={{ width: 224, height: 224, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.7,
              }}
            />
            <motion.div
              className="absolute rounded-full border border-indigo-300/10"
              initial={{ width: 128, height: 128, opacity: 0.4 }}
              animate={{ width: 224, height: 224, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1.4,
              }}
            />
          </>
        )}

        {/* Connecting spinner ring */}
        {widgetState === "connecting" && (
          <motion.div
            className="absolute h-40 w-40 rounded-full border-2 border-transparent border-t-indigo-400/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Outer ambient glow */}
        <motion.div
          className="absolute h-40 w-40 rounded-full bg-indigo-500/5 blur-2xl"
          animate={{
            scale:
              widgetState === "active"
                ? isSpeaking
                  ? [1, 1.4, 1]
                  : [1, 1.15, 1]
                : widgetState === "connecting"
                  ? [1, 1.2, 1]
                  : widgetState === "ended"
                    ? 1
                    : [1, 1.08, 1],
            opacity: widgetState === "ended" ? 0.3 : [0.4, 0.7, 0.4],
          }}
          transition={{
            duration:
              widgetState === "active" && isSpeaking
                ? 1.2
                : widgetState === "connecting"
                  ? 0.8
                  : 3,
            repeat: widgetState === "ended" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner ambient glow */}
        <motion.div
          className="absolute h-32 w-32 rounded-full bg-indigo-500/10 blur-xl"
          animate={{
            scale:
              widgetState === "active"
                ? isSpeaking
                  ? [1, 1.3, 1]
                  : [1, 1.1, 1]
                : widgetState === "connecting"
                  ? [1, 1.15, 1]
                  : widgetState === "ended"
                    ? 1
                    : [1, 1.05, 1],
            opacity: widgetState === "ended" ? 0.2 : [0.5, 0.8, 0.5],
          }}
          transition={{
            duration:
              widgetState === "active" && isSpeaking
                ? 1.5
                : widgetState === "connecting"
                  ? 0.8
                  : 3,
            repeat: widgetState === "ended" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main orb body */}
        <motion.div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full shadow-xl ${
            widgetState === "ended"
              ? "bg-gradient-to-br from-gray-400/40 to-gray-400/20 shadow-gray-200/30"
              : "bg-gradient-to-br from-indigo-500 via-indigo-500/90 to-indigo-400/60 shadow-indigo-500/25"
          }`}
          animate={{
            scale:
              widgetState === "active"
                ? isSpeaking
                  ? [1, 1.08, 1]
                  : [1, 1.03, 1]
                : widgetState === "connecting"
                  ? [1, 1.05, 1]
                  : widgetState === "ended"
                    ? 1
                    : [1, 1.02, 1],
          }}
          transition={{
            duration:
              widgetState === "active" && isSpeaking
                ? 0.8
                : widgetState === "connecting"
                  ? 0.6
                  : 2.5,
            repeat: widgetState === "ended" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Glass highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/5 to-white/15" />

          {/* Inner content */}
          {widgetState === "connecting" ? (
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-transparent border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          ) : widgetState === "active" ? (
            isSpeaking ? (
              <motion.div
                className="flex items-center gap-0.5"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-white"
                    animate={{
                      height: [8, 20 + Math.random() * 12, 8],
                    }}
                    transition={{
                      duration: 0.6 + Math.random() * 0.3,
                      repeat: Infinity,
                      delay: i * 0.12,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Mic icon */}
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              </motion.div>
            )
          ) : widgetState === "ended" ? (
            <svg
              className="h-8 w-8 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
              />
            </svg>
          ) : (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Error display ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && widgetState !== "error" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-600"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live transcript ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex-1 overflow-hidden px-1"
          >
            <div className="h-full max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <div className="space-y-2">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-500 text-white"
                          : "bg-white text-gray-800 shadow-sm"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`mt-0.5 text-[9px] ${
                          msg.role === "user"
                            ? "text-white/50"
                            : "text-gray-400"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ended state ─────────────────────────────────────────────────── */}
      {widgetState === "ended" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm font-medium text-gray-700">
            Thanks for the conversation!
          </p>
          <button
            onClick={resetToIdle}
            className="mt-2 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-600"
          >
            Start New Conversation
          </button>
        </motion.div>
      )}

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-2 pt-3">
        {widgetState === "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button
              onClick={startConversation}
              className="flex items-center gap-2 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
              Start Conversation
            </button>
          </motion.div>
        )}

        {widgetState === "connecting" && (
          <button
            disabled
            className="flex items-center gap-2 rounded-full bg-indigo-400 px-5 py-2.5 text-sm font-medium text-white opacity-80"
          >
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-transparent border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            Connecting...
          </button>
        )}

        {widgetState === "active" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="rounded-full border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 19L17.591 17.591L5.409 5.409L4 4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5M12 18.75a6 6 0 01-6-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>

            {/* End conversation */}
            <button
              onClick={endConversation}
              className="flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-colors hover:bg-red-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 3.75L18 6m0 0l2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5a16.5 16.5 0 01-13.5-13.5m0 0L2.25 6.75 6 3l2.25 3.75L6 9l-2.25-.75z"
                />
              </svg>
              End
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Powered by ──────────────────────────────────────────────────── */}
      <div className="pb-1 pt-1">
        <p className="text-[10px] text-gray-400">Powered by LUNA</p>
      </div>
    </div>
  );
}

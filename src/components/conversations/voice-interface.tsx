"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Star,
  ArrowLeft,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceInterfaceProps {
  orgId: string;
  agentId: string;
  agentName: string;
  greetingMessage?: string;
}

type ConversationState = "idle" | "connecting" | "active" | "ended";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceInterface({
  orgId,
  agentId,
  agentName,
  greetingMessage,
}: VoiceInterfaceProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [state, setState] = useState<ConversationState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ConversationState>(state);

  // Keep a ref to the latest state so callbacks can read it synchronously
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── ElevenLabs Conversation Hook ────────────────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      setState("active");
      if (greetingMessage) {
        setMessages((prev) => [
          ...prev,
          { role: "agent", content: greetingMessage, timestamp: new Date() },
        ]);
      }
    },
    onDisconnect: () => {
      if (stateRef.current === "active") {
        setState("ended");
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
      setState("idle");
    },
  });

  // ── Start / End Conversation ────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    try {
      setState("connecting");
      setError(null);
      setMessages([]);
      setRating(0);
      setFeedback("");

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from API
      const res = await fetch("/api/conversations/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to start conversation");
      }

      const data = await res.json();
      setConversationId(data.conversationId);

      // Start ElevenLabs session
      await conversation.startSession({ signedUrl: data.signedUrl });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation",
      );
      setState("idle");
    }
  }, [agentId, conversation]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      // Session may already be closed
    }
    setState("ended");
  }, [conversation]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      conversation.setVolume({ volume: 1 });
    } else {
      conversation.setVolume({ volume: 0 });
    }
    setIsMuted((prev) => !prev);
  }, [isMuted, conversation]);

  // ── Submit Rating ───────────────────────────────────────────────────────
  const submitRating = useCallback(async () => {
    if (!conversationId || rating === 0) return;

    try {
      await fetch(`/api/conversations/${conversationId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });
    } catch {
      // Rating submission failed silently -- non-critical
      console.warn("Failed to submit conversation rating");
    }

    // Reset to allow starting a new conversation
    setState("idle");
    setMessages([]);
    setRating(0);
    setFeedback("");
    setConversationId(null);
  }, [conversationId, rating, feedback]);

  // ── Auto-scroll transcript ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Format time ─────────────────────────────────────────────────────────
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── The Orb ─────────────────────────────────────────────────────────────
  const Orb = () => {
    const isSpeaking = conversation.isSpeaking;
    const isActive = state === "active";
    const isConnecting = state === "connecting";
    const isEnded = state === "ended";

    return (
      <div className="relative flex h-64 items-center justify-center">
        {/* Expanding ring waves when speaking */}
        {isActive && isSpeaking && (
          <>
            <motion.div
              className="absolute rounded-full border-2 border-primary/20"
              initial={{ width: 192, height: 192, opacity: 0.6 }}
              animate={{ width: 320, height: 320, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <motion.div
              className="absolute rounded-full border-2 border-primary/15"
              initial={{ width: 192, height: 192, opacity: 0.5 }}
              animate={{ width: 320, height: 320, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.7,
              }}
            />
            <motion.div
              className="absolute rounded-full border border-primary/10"
              initial={{ width: 192, height: 192, opacity: 0.4 }}
              animate={{ width: 320, height: 320, opacity: 0 }}
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
        {isConnecting && (
          <motion.div
            className="absolute h-56 w-56 rounded-full border-2 border-transparent border-t-primary/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Outer ambient glow */}
        <motion.div
          className="absolute h-56 w-56 rounded-full bg-primary/5 blur-2xl"
          animate={{
            scale: isActive
              ? isSpeaking
                ? [1, 1.4, 1]
                : [1, 1.15, 1]
              : isConnecting
                ? [1, 1.2, 1]
                : isEnded
                  ? 1
                  : [1, 1.08, 1],
            opacity: isEnded ? 0.3 : [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: isActive && isSpeaking ? 1.2 : isConnecting ? 0.8 : 3,
            repeat: isEnded ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner ambient glow */}
        <motion.div
          className="absolute h-48 w-48 rounded-full bg-primary/10 blur-xl"
          animate={{
            scale: isActive
              ? isSpeaking
                ? [1, 1.3, 1]
                : [1, 1.1, 1]
              : isConnecting
                ? [1, 1.15, 1]
                : isEnded
                  ? 1
                  : [1, 1.05, 1],
            opacity: isEnded ? 0.2 : [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: isActive && isSpeaking ? 1.5 : isConnecting ? 0.8 : 3,
            repeat: isEnded ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main orb body */}
        <motion.div
          className={`relative flex h-48 w-48 items-center justify-center rounded-full shadow-2xl ${
            isEnded
              ? "bg-gradient-to-br from-muted-foreground/40 to-muted-foreground/20 shadow-muted/10"
              : "bg-gradient-to-br from-primary via-primary/90 to-primary/60 shadow-primary/25"
          }`}
          animate={{
            scale: isActive
              ? isSpeaking
                ? [1, 1.08, 1]
                : [1, 1.03, 1]
              : isConnecting
                ? [1, 1.05, 1]
                : isEnded
                  ? 1
                  : [1, 1.02, 1],
          }}
          transition={{
            duration: isActive && isSpeaking ? 0.8 : isConnecting ? 0.6 : 2.5,
            repeat: isEnded ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Glass highlight overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/5 to-white/15" />

          {/* Inner content */}
          {isConnecting ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary-foreground" />
          ) : isActive ? (
            isSpeaking ? (
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full bg-primary-foreground"
                    animate={{
                      height: [12, 28 + Math.random() * 16, 12],
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
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Mic className="h-12 w-12 text-primary-foreground" />
              </motion.div>
            )
          ) : isEnded ? (
            <Phone className="h-12 w-12 text-primary-foreground/50" />
          ) : (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Mic className="h-12 w-12 text-primary-foreground" />
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col items-center">
      {/* Agent name + status indicator */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{agentName}</h2>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          {state === "active" && (
            <motion.span
              className="inline-block h-2 w-2 rounded-full bg-emerald-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <p className="text-sm text-muted-foreground">
            {state === "idle" && "Ready to start a conversation"}
            {state === "connecting" && "Connecting to agent..."}
            {state === "active" &&
              (conversation.isSpeaking
                ? "Agent is speaking..."
                : "Listening...")}
            {state === "ended" && "Conversation ended"}
          </p>
        </div>
      </div>

      {/* The Orb -- central visual element */}
      <Orb />

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 max-w-md rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live transcript */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 w-full max-w-lg flex-1"
          >
            <ScrollArea className="h-full max-h-64 rounded-xl border bg-card/50 p-4 backdrop-blur-sm">
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.role === "user"
                            ? "text-primary-foreground/50"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-conversation rating (ended state only) */}
      <AnimatePresence>
        {state === "ended" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 w-full max-w-sm space-y-5 text-center"
          >
            <div>
              <p className="text-base font-medium">
                How was your conversation?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your feedback helps us improve
              </p>
            </div>

            {/* Star rating */}
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="rounded-md p-1 transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/25 hover:text-muted-foreground/50"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Feedback textarea */}
            <Textarea
              placeholder="Any additional feedback? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="resize-none"
              rows={3}
            />

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setState("idle");
                  setMessages([]);
                  setRating(0);
                  setFeedback("");
                  setConversationId(null);
                  setError(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Start New
              </Button>
              {rating > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Button onClick={submitRating}>Submit Rating</Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls -- pinned to the bottom */}
      <div className="mt-auto flex items-center gap-3 pb-4 pt-6">
        {state === "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              size="lg"
              onClick={startConversation}
              className="gap-2 rounded-full px-8 py-6 text-lg shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Mic className="h-5 w-5" />
              Start Conversation
            </Button>
          </motion.div>
        )}

        {state === "connecting" && (
          <Button
            size="lg"
            disabled
            className="gap-2 rounded-full px-8 py-6 text-lg"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting...
          </Button>
        )}

        {state === "active" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            {/* Mute / unmute toggle */}
            <Button
              size="lg"
              variant="outline"
              onClick={toggleMute}
              className="rounded-full px-5 py-6"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            {/* End conversation */}
            <Button
              size="lg"
              variant="destructive"
              onClick={endConversation}
              className="gap-2 rounded-full px-8 py-6 text-lg shadow-lg shadow-destructive/20"
            >
              <PhoneOff className="h-5 w-5" />
              End Conversation
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

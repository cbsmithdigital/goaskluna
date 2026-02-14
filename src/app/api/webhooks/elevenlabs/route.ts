import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reportUsage } from "@/lib/stripe";

/**
 * ElevenLabs post-call webhook handler
 * Receives conversation transcript and metadata after a call ends
 */
export async function POST(req: Request) {
  const headerPayload = await headers();
  const webhookSecret = headerPayload.get("x-webhook-secret");

  // Verify webhook authenticity
  if (webhookSecret !== process.env.ELEVENLABS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const payload = await req.json();

  const {
    conversation_id,
    agent_id,
    status,
    transcript,
    metadata,
    analysis,
  } = payload;

  if (!conversation_id || !agent_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Find the agent in our system
  const agent = await db.agent.findUnique({
    where: { elevenLabsAgentId: agent_id },
    include: { organization: true },
  });

  if (!agent) {
    console.error(`[ElevenLabs Webhook] Agent not found: ${agent_id}`);
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Calculate duration and billable minutes
  const durationSeconds = metadata?.call_duration_secs || 0;
  const billableMinutes = Math.ceil(durationSeconds / 60);

  // Count messages and analyze for no-answers
  let messageCount = 0;
  let noAnswerCount = 0;
  let wasEscalated = false;

  const messages: Array<{
    role: "USER" | "AGENT" | "SYSTEM";
    content: string;
    wasNoAnswer: boolean;
    wasEscalation: boolean;
  }> = [];

  if (Array.isArray(transcript)) {
    for (const entry of transcript) {
      messageCount++;
      const role = entry.role === "user" ? "USER" as const : "AGENT" as const;
      const content = entry.message || entry.text || "";

      // Detect "I don't know" responses
      const isNoAnswer =
        role === "AGENT" &&
        (content.toLowerCase().includes("i don't have that information") ||
          content.toLowerCase().includes("i'm not sure") ||
          content.toLowerCase().includes("i don't know") ||
          content.toLowerCase().includes("contact hr") ||
          content.toLowerCase().includes("ask your manager"));

      // Detect escalation
      const isEscalation =
        role === "AGENT" &&
        (content.toLowerCase().includes("creating a ticket") ||
          content.toLowerCase().includes("escalating") ||
          content.toLowerCase().includes("connecting you"));

      if (isNoAnswer) noAnswerCount++;
      if (isEscalation) wasEscalated = true;

      messages.push({
        role,
        content,
        wasNoAnswer: isNoAnswer,
        wasEscalation: isEscalation,
      });
    }
  }

  // Create or update conversation record
  const conversation = await db.conversation.upsert({
    where: { elevenLabsConversationId: conversation_id },
    update: {
      status: status === "done" ? "COMPLETED" : "ERRORED",
      durationSeconds,
      billableMinutes,
      messageCount,
      noAnswerCount,
      wasEscalated,
      endedAt: new Date(),
    },
    create: {
      orgId: agent.orgId,
      agentId: agent.id,
      elevenLabsConversationId: conversation_id,
      status: status === "done" ? "COMPLETED" : "ERRORED",
      durationSeconds,
      billableMinutes,
      messageCount,
      noAnswerCount,
      wasEscalated,
      startedAt: new Date(Date.now() - durationSeconds * 1000),
      endedAt: new Date(),
    },
  });

  // Store conversation messages
  if (messages.length > 0) {
    await db.conversationMessage.createMany({
      data: messages.map((msg, index) => ({
        conversationId: conversation.id,
        role: msg.role,
        content: msg.content,
        wasNoAnswer: msg.wasNoAnswer,
        wasEscalation: msg.wasEscalation,
        durationMs: index === 0 ? 0 : undefined,
      })),
    });
  }

  // Create usage record and report to Stripe
  if (billableMinutes > 0 && agent.organization.stripeCustomerId) {
    const perMinuteCents = 3; // $0.03 default
    const costCents = billableMinutes * perMinuteCents;

    try {
      const meterEventId = await reportUsage(
        agent.organization.stripeCustomerId,
        billableMinutes,
        conversation.id,
      );

      await db.usageRecord.create({
        data: {
          orgId: agent.orgId,
          agentId: agent.id,
          conversationId: conversation.id,
          minutes: billableMinutes,
          costCents,
          stripeMeterEventId: meterEventId,
          reported: true,
        },
      });
    } catch (error) {
      console.error("[ElevenLabs Webhook] Failed to report usage:", error);

      // Still create the usage record, mark as unreported
      await db.usageRecord.create({
        data: {
          orgId: agent.orgId,
          agentId: agent.id,
          conversationId: conversation.id,
          minutes: billableMinutes,
          costCents: billableMinutes * 3,
          reported: false,
        },
      });
    }

    // Update org usage counter
    await db.organization.update({
      where: { id: agent.orgId },
      data: { usedMinutes: { increment: billableMinutes } },
    });
  }

  return NextResponse.json({ received: true, conversationId: conversation.id });
}

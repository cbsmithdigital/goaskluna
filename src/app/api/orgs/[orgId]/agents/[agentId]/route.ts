import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { updateAgentSchema } from "@/lib/validators";
import { updateAgent as updateElevenLabsAgent, deleteAgent as deleteElevenLabsAgent } from "@/lib/elevenlabs/client";
import { createAuditLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

export const GET = withOrgPermission("agent:use", async (req, { orgId }) => {
  const agentId = req.url.split("/agents/")[1]?.split("/")[0]?.split("?")[0];

  const agent = await db.agent.findFirst({
    where: { id: agentId, orgId },
    include: {
      kbLinks: {
        include: { knowledgeBase: { select: { id: true, name: true, type: true } } },
      },
      deployments: { select: { id: true, name: true, type: true, isActive: true } },
      _count: { select: { conversations: true } },
    },
  });

  if (!agent) throw new NotFoundError("Agent");

  return NextResponse.json(agent);
});

export const PATCH = withOrgPermission("agent:manage", async (req, { orgId, userId }) => {
  const agentId = req.url.split("/agents/")[1]?.split("/")[0]?.split("?")[0];
  const body = await req.json();
  const { knowledgeBaseIds, ...data } = updateAgentSchema.parse(body);

  const existing = await db.agent.findFirst({
    where: { id: agentId, orgId },
  });
  if (!existing) throw new NotFoundError("Agent");

  // Update in ElevenLabs if connected
  if (existing.elevenLabsAgentId) {
    try {
      await updateElevenLabsAgent(existing.elevenLabsAgentId, {
        name: data.name,
        conversation_config: {
          agent: {
            prompt: { prompt: data.systemPrompt || "" },
            first_message: data.greetingMessage || undefined,
            language: data.language,
          },
          tts: data.voiceId ? { voice_id: data.voiceId } : undefined,
        },
      });
    } catch (error) {
      console.error("[Agent Update] ElevenLabs sync error:", error);
    }
  }

  const agent = await db.agent.update({
    where: { id: agentId },
    data,
  });

  await createAuditLog({
    orgId,
    userId,
    action: "agent.update",
    entityType: "Agent",
    entityId: agentId,
    metadata: { changes: data },
  });

  return NextResponse.json(agent);
});

export const DELETE = withOrgPermission("agent:manage", async (req, { orgId, userId }) => {
  const agentId = req.url.split("/agents/")[1]?.split("/")[0]?.split("?")[0];

  const agent = await db.agent.findFirst({
    where: { id: agentId, orgId },
  });
  if (!agent) throw new NotFoundError("Agent");

  // Delete from ElevenLabs
  if (agent.elevenLabsAgentId) {
    try {
      await deleteElevenLabsAgent(agent.elevenLabsAgentId);
    } catch (error) {
      console.error("[Agent Delete] ElevenLabs error:", error);
    }
  }

  await db.agent.delete({ where: { id: agentId } });

  await createAuditLog({
    orgId,
    userId,
    action: "agent.delete",
    entityType: "Agent",
    entityId: agentId,
    metadata: { name: agent.name },
  });

  return NextResponse.json({ success: true });
});

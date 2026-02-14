import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { createAgentSchema } from "@/lib/validators";
import { createAgent as createElevenLabsAgent } from "@/lib/elevenlabs/client";
import { createAuditLog } from "@/lib/audit";

export const GET = withOrgPermission("agent:use", async (req, { orgId }) => {
  const agents = await db.agent.findMany({
    where: { orgId },
    include: {
      _count: {
        select: { kbLinks: true, deployments: true, conversations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agents);
});

export const POST = withOrgPermission("agent:manage", async (req, { orgId, userId }) => {
  const body = await req.json();
  const data = createAgentSchema.parse(body);

  const { knowledgeBaseIds, ...agentData } = data;

  // Create agent in ElevenLabs
  let elevenLabsAgentId: string | null = null;
  try {
    const elevenLabsAgent = await createElevenLabsAgent({
      name: data.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: data.systemPrompt || `You are a helpful voice assistant for an organization. Answer questions based only on the provided knowledge base. If you don't know the answer, say so and suggest contacting HR or a manager.`,
          },
          first_message: data.greetingMessage || undefined,
          language: data.language,
        },
        tts: data.voiceId ? { voice_id: data.voiceId } : undefined,
      },
    });
    elevenLabsAgentId = elevenLabsAgent.agent_id;
  } catch (error) {
    console.error("[Agent Create] ElevenLabs error:", error);
    // Continue without ElevenLabs - agent can be synced later
  }

  // Create agent in database
  const agent = await db.agent.create({
    data: {
      ...agentData,
      orgId,
      elevenLabsAgentId,
    },
  });

  // Link knowledge bases
  if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
    await db.agentKBLink.createMany({
      data: knowledgeBaseIds.map((kbId, index) => ({
        agentId: agent.id,
        knowledgeBaseId: kbId,
        priority: index,
      })),
    });
  }

  await createAuditLog({
    orgId,
    userId,
    action: "agent.create",
    entityType: "Agent",
    entityId: agent.id,
    metadata: { name: agent.name },
  });

  return NextResponse.json(agent, { status: 201 });
});

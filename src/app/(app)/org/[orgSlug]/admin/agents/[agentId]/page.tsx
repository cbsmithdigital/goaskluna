import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AgentDetailClient } from "./agent-detail-client";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; agentId: string }>;
}) {
  const { orgSlug, agentId } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) redirect("/dashboard");

  const agent = await db.agent.findFirst({
    where: { id: agentId, orgId: org.id },
    include: {
      kbLinks: {
        include: {
          knowledgeBase: {
            select: { id: true, name: true, type: true },
          },
        },
      },
      _count: {
        select: { conversations: true, deployments: true },
      },
    },
  });

  if (!agent) redirect(`/org/${orgSlug}/admin/agents`);

  const conversations = await db.conversation.findMany({
    where: { agentId: agent.id, orgId: org.id },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      durationSeconds: true,
      messageCount: true,
      wasEscalated: true,
      rating: true,
      startedAt: true,
      endedAt: true,
      user: {
        select: { name: true, email: true },
      },
    },
  });

  const knowledgeBases = await db.knowledgeBase.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  // Compute average duration from conversations with duration data
  const durationsWithData = conversations.filter(
    (c) => c.durationSeconds != null
  );
  const avgDurationSeconds =
    durationsWithData.length > 0
      ? Math.round(
          durationsWithData.reduce(
            (sum, c) => sum + (c.durationSeconds ?? 0),
            0
          ) / durationsWithData.length
        )
      : 0;

  // Serialize Date objects for client component
  const serialized = JSON.parse(JSON.stringify({ agent, conversations }));

  return (
    <AgentDetailClient
      agent={serialized.agent}
      conversations={serialized.conversations}
      knowledgeBases={knowledgeBases}
      avgDurationSeconds={avgDurationSeconds}
      orgId={org.id}
      orgSlug={orgSlug}
    />
  );
}

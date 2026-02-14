import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";

export const GET = withOrgPermission("analytics:view_team", async (req, { orgId }) => {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const conversations = await db.conversation.findMany({
    where: {
      orgId,
      startedAt: { gte: startDate },
    },
    select: {
      id: true,
      agentId: true,
      durationSeconds: true,
      billableMinutes: true,
      messageCount: true,
      noAnswerCount: true,
      wasEscalated: true,
      status: true,
      startedAt: true,
    },
  });

  const totalSessions = conversations.length;
  const totalMinutes = conversations.reduce((s, c) => s + (c.billableMinutes || 0), 0);
  const totalMessages = conversations.reduce((s, c) => s + c.messageCount, 0);
  const noAnswerTotal = conversations.reduce((s, c) => s + c.noAnswerCount, 0);
  const escalationCount = conversations.filter((c) => c.wasEscalated).length;
  const avgDuration = totalSessions > 0
    ? conversations.reduce((s, c) => s + (c.durationSeconds || 0), 0) / totalSessions
    : 0;

  // Group by agent
  const byAgent: Record<string, { sessions: number; minutes: number }> = {};
  for (const c of conversations) {
    if (!byAgent[c.agentId]) byAgent[c.agentId] = { sessions: 0, minutes: 0 };
    byAgent[c.agentId].sessions++;
    byAgent[c.agentId].minutes += c.billableMinutes || 0;
  }

  // Group by day
  const byDay: Record<string, { sessions: number; minutes: number }> = {};
  for (const c of conversations) {
    const day = c.startedAt.toISOString().split("T")[0];
    if (!byDay[day]) byDay[day] = { sessions: 0, minutes: 0 };
    byDay[day].sessions++;
    byDay[day].minutes += c.billableMinutes || 0;
  }

  return NextResponse.json({
    summary: {
      totalSessions,
      totalMinutes,
      totalMessages,
      noAnswerTotal,
      noAnswerRate: totalMessages > 0 ? noAnswerTotal / totalMessages : 0,
      escalationCount,
      escalationRate: totalSessions > 0 ? escalationCount / totalSessions : 0,
      avgDurationSeconds: avgDuration,
      estimatedCostCents: Math.round(totalMinutes * 3),
    },
    byAgent,
    byDay,
  });
});

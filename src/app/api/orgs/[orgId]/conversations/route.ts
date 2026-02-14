import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";

export const GET = withOrgPermission("conversations:view_all", async (req, { orgId }) => {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const where: Record<string, unknown> = { orgId };
  if (agentId) where.agentId = agentId;
  if (status) where.status = status;

  const [conversations, total] = await Promise.all([
    db.conversation.findMany({
      where,
      include: {
        agent: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.conversation.count({ where }),
  ]);

  return NextResponse.json({ conversations, total, limit, offset });
});

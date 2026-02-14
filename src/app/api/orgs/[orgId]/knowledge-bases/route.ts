import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { createKBSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const GET = withOrgPermission("kb:read", async (req, { orgId }) => {
  const knowledgeBases = await db.knowledgeBase.findMany({
    where: { orgId },
    include: {
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(knowledgeBases);
});

export const POST = withOrgPermission("kb:manage", async (req, { orgId, userId }) => {
  const body = await req.json();
  const data = createKBSchema.parse(body);

  const kb = await db.knowledgeBase.create({
    data: {
      ...data,
      orgId,
    },
  });

  await createAuditLog({
    orgId,
    userId,
    action: "knowledgeBase.create",
    entityType: "KnowledgeBase",
    entityId: kb.id,
    metadata: { name: kb.name },
  });

  return NextResponse.json(kb, { status: 201 });
});

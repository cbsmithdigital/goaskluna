import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { updateKBSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

export const GET = withOrgPermission("kb:read", async (req, { orgId }) => {
  const kbId = req.url.split("/knowledge-bases/")[1]?.split("/")[0];

  const kb = await db.knowledgeBase.findFirst({
    where: { id: kbId, orgId },
    include: {
      documents: {
        orderBy: { updatedAt: "desc" },
      },
      _count: { select: { documents: true, agentKBLinks: true } },
    },
  });

  if (!kb) throw new NotFoundError("Knowledge Base");

  return NextResponse.json(kb);
});

export const PATCH = withOrgPermission("kb:manage", async (req, { orgId, userId }) => {
  const kbId = req.url.split("/knowledge-bases/")[1]?.split("/")[0];
  const body = await req.json();
  const data = updateKBSchema.parse(body);

  const kb = await db.knowledgeBase.updateMany({
    where: { id: kbId, orgId },
    data,
  });

  if (kb.count === 0) throw new NotFoundError("Knowledge Base");

  await createAuditLog({
    orgId,
    userId,
    action: "knowledgeBase.update",
    entityType: "KnowledgeBase",
    entityId: kbId,
    metadata: { changes: data },
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withOrgPermission("kb:manage", async (req, { orgId, userId }) => {
  const kbId = req.url.split("/knowledge-bases/")[1]?.split("/")[0];

  const kb = await db.knowledgeBase.deleteMany({
    where: { id: kbId, orgId },
  });

  if (kb.count === 0) throw new NotFoundError("Knowledge Base");

  await createAuditLog({
    orgId,
    userId,
    action: "knowledgeBase.delete",
    entityType: "KnowledgeBase",
    entityId: kbId,
  });

  return NextResponse.json({ success: true });
});

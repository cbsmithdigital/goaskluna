import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { updateOrgSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

export const GET = withOrgPermission("kb:read", async (req, { orgId }) => {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: {
          agents: true,
          knowledgeBases: true,
          memberships: true,
          conversations: true,
        },
      },
    },
  });

  return NextResponse.json(org);
});

export const PATCH = withOrgPermission("org:manage", async (req, { orgId, userId }) => {
  const body = await req.json();
  const { settings, ...rest } = updateOrgSchema.parse(body);

  const org = await db.organization.update({
    where: { id: orgId },
    data: {
      ...rest,
      ...(settings !== undefined && { settings: settings as Prisma.InputJsonValue }),
    },
  });

  await createAuditLog({
    orgId,
    userId,
    action: "organization.update",
    entityType: "Organization",
    entityId: orgId,
    metadata: { changes: { ...rest, settings } },
  });

  return NextResponse.json(org);
});

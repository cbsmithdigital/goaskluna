import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { updateMemberSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";

export const PATCH = withOrgPermission("org:members:manage", async (req, { orgId, userId }) => {
  const memberId = req.url.split("/members/")[1]?.split("/")[0]?.split("?")[0];
  const body = await req.json();
  const data = updateMemberSchema.parse(body);

  const membership = await db.orgMembership.findFirst({
    where: { id: memberId, orgId },
  });
  if (!membership) throw new NotFoundError("Membership");

  const updated = await db.orgMembership.update({
    where: { id: memberId },
    data: { role: data.role },
  });

  await createAuditLog({
    orgId,
    userId,
    action: "member.role_updated",
    entityType: "OrgMembership",
    entityId: memberId,
    metadata: { oldRole: membership.role, newRole: data.role },
  });

  return NextResponse.json(updated);
});

export const DELETE = withOrgPermission("org:members:manage", async (req, { orgId, userId }) => {
  const memberId = req.url.split("/members/")[1]?.split("/")[0]?.split("?")[0];

  const membership = await db.orgMembership.findFirst({
    where: { id: memberId, orgId },
  });
  if (!membership) throw new NotFoundError("Membership");

  await db.orgMembership.delete({ where: { id: memberId } });

  await createAuditLog({
    orgId,
    userId,
    action: "member.removed",
    entityType: "OrgMembership",
    entityId: memberId,
    metadata: { removedUserId: membership.userId },
  });

  return NextResponse.json({ success: true });
});

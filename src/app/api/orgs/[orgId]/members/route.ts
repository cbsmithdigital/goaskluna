import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";

export const GET = withOrgPermission("org:members:manage", async (req, { orgId }) => {
  const memberships = await db.orgMembership.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(memberships);
});

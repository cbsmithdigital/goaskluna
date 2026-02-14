import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";

export const GET = withOrgPermission("billing:manage", async (req, { orgId }) => {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      includedMinutes: true,
      usedMinutes: true,
      hardCutoff: true,
      graceNotified: true,
    },
  });

  // Current period usage records
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const usageRecords = await db.usageRecord.findMany({
    where: {
      orgId,
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalMinutes = usageRecords.reduce((sum, r) => sum + r.minutes, 0);
  const totalCost = usageRecords.reduce((sum, r) => sum + r.costCents, 0);

  return NextResponse.json({
    ...org,
    currentPeriod: {
      totalMinutes,
      totalCostCents: totalCost,
      records: usageRecords,
    },
  });
});

import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BillingClient } from "./billing-client";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      includedMinutes: true,
      usedMinutes: true,
      hardCutoff: true,
      graceNotified: true,
    },
  });
  if (!org) redirect("/dashboard");

  // Current period usage records
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const usageRecords = await db.usageRecord.findMany({
    where: {
      orgId: org.id,
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalMinutes = usageRecords.reduce((sum, r) => sum + r.minutes, 0);
  const totalCostCents = usageRecords.reduce((sum, r) => sum + r.costCents, 0);

  // Serialize for client component
  const serializedRecords = usageRecords.map((r) => ({
    id: r.id,
    minutes: r.minutes,
    costCents: r.costCents,
    agentName: r.agent.name,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <BillingClient
      orgId={org.id}
      includedMinutes={org.includedMinutes}
      usedMinutes={org.usedMinutes}
      hardCutoff={org.hardCutoff}
      graceNotified={org.graceNotified}
      totalMinutes={totalMinutes}
      totalCostCents={totalCostCents}
      records={serializedRecords}
    />
  );
}

import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) redirect("/dashboard");

  // Fetch agent names for the by-agent breakdown
  const agents = await db.agent.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true },
  });

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  return <AnalyticsClient orgId={org.id} agentNames={agentMap} />;
}

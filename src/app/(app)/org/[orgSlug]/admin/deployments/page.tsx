import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DeploymentsClient } from "./deployments-client";

export default async function DeploymentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) redirect("/dashboard");

  const deployments = await db.deployment.findMany({
    where: { orgId: org.id },
    include: {
      agent: { select: { id: true, name: true } },
      _count: { select: { conversations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const agents = await db.agent.findMany({
    where: { orgId: org.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const serialized = JSON.parse(JSON.stringify(deployments));

  return (
    <DeploymentsClient
      deployments={serialized}
      agents={agents}
      orgId={org.id}
      orgSlug={orgSlug}
    />
  );
}

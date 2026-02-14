import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ConversationsClient } from "./conversations-client";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) redirect("/dashboard");

  // Fetch agents for filter dropdown
  const agents = await db.agent.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const serializedAgents = agents.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  return <ConversationsClient orgId={org.id} agents={serializedAgents} />;
}

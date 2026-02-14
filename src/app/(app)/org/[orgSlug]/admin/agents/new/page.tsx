import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreateAgentForm } from "./create-agent-form";

export default async function CreateAgentPage({
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

  const knowledgeBases = await db.knowledgeBase.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return (
    <CreateAgentForm
      orgId={org.id}
      orgSlug={orgSlug}
      knowledgeBases={knowledgeBases}
    />
  );
}

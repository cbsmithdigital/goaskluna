import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { KnowledgeBasesClient } from "./knowledge-bases-client";

export default async function KnowledgeBasesPage({
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
    include: {
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for client component
  const serializedKBs = knowledgeBases.map((kb) => ({
    id: kb.id,
    name: kb.name,
    description: kb.description,
    type: kb.type,
    visibility: kb.visibility,
    lastSyncedAt: kb.lastSyncedAt?.toISOString() ?? null,
    createdAt: kb.createdAt.toISOString(),
    updatedAt: kb.updatedAt.toISOString(),
    _count: kb._count,
  }));

  return (
    <KnowledgeBasesClient
      knowledgeBases={serializedKBs}
      orgId={org.id}
      orgSlug={orgSlug}
    />
  );
}

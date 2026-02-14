import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { KnowledgeBaseDetailClient } from "./kb-detail-client";

export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; kbId: string }>;
}) {
  const { orgSlug, kbId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
  });
  if (!org) redirect("/dashboard");

  const knowledgeBase = await db.knowledgeBase.findUnique({
    where: { id: kbId, orgId: org.id },
  });
  if (!knowledgeBase) redirect(`/org/${orgSlug}/admin/knowledge-bases`);

  const documents = await db.document.findMany({
    where: { knowledgeBaseId: kbId },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for client component
  const serializedKB = {
    id: knowledgeBase.id,
    name: knowledgeBase.name,
    description: knowledgeBase.description,
    type: knowledgeBase.type,
    visibility: knowledgeBase.visibility,
    lastSyncedAt: knowledgeBase.lastSyncedAt?.toISOString() ?? null,
    createdAt: knowledgeBase.createdAt.toISOString(),
    updatedAt: knowledgeBase.updatedAt.toISOString(),
  };

  const serializedDocs = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSizeBytes: doc.fileSizeBytes,
    status: doc.status,
    statusMessage: doc.statusMessage,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return (
    <KnowledgeBaseDetailClient
      knowledgeBase={serializedKB}
      documents={serializedDocs}
      orgId={org.id}
      orgSlug={orgSlug}
    />
  );
}

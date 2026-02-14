import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { VoiceInterface } from "@/components/conversations/voice-interface";

export default async function TalkToAgentPage({
  params,
}: {
  params: Promise<{ orgSlug: string; agentId: string }>;
}) {
  const { orgSlug, agentId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) redirect("/dashboard");

  const agent = await db.agent.findFirst({
    where: { id: agentId, orgId: org.id, isActive: true },
    select: { id: true, name: true, greetingMessage: true, language: true },
  });

  if (!agent) redirect(`/org/${orgSlug}/talk`);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <VoiceInterface
        orgId={org.id}
        agentId={agent.id}
        agentName={agent.name}
        greetingMessage={agent.greetingMessage || undefined}
      />
    </div>
  );
}

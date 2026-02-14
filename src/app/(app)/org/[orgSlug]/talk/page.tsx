import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Mic, Globe2, MessageSquare } from "lucide-react";

export default async function TalkPage({
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

  const agents = await db.agent.findMany({
    where: { orgId: org.id, isActive: true },
    include: {
      _count: {
        select: { conversations: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Talk to an Agent
        </h1>
        <p className="mt-1 text-muted-foreground">
          Select an agent to start a voice conversation
        </p>
      </div>

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <Mic className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No agents available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact your admin to set up voice agents for your organization.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/org/${orgSlug}/talk/${agent.id}`}
            >
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-bold leading-tight">
                        {agent.name}
                      </CardTitle>
                    </div>
                    <Badge variant="outline">
                      <Globe2 className="mr-1 h-3 w-3" />
                      {agent.language}
                    </Badge>
                  </div>
                  {agent.description && (
                    <CardDescription className="mt-1.5 line-clamp-2">
                      {agent.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>
                      {agent._count.conversations}{" "}
                      {agent._count.conversations === 1
                        ? "conversation"
                        : "conversations"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

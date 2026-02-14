import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Bot,
  Database,
  Rocket,
  MessageSquare,
} from "lucide-react";

export default async function AgentsPage({
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
    where: { orgId: org.id },
    include: {
      _count: {
        select: {
          kbLinks: true,
          deployments: true,
          conversations: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your AI voice agents
          </p>
        </div>
        <Link href={`/org/${orgSlug}/admin/agents/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <Bot className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No agents yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first voice agent to get started.
          </p>
          <Link href={`/org/${orgSlug}/admin/agents/new`}>
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/org/${orgSlug}/admin/agents/${agent.id}`}
            >
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-bold leading-tight">
                      {agent.name}
                    </CardTitle>
                    <div className="flex gap-1.5">
                      <Badge
                        variant={agent.isActive ? "default" : "secondary"}
                      >
                        {agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant={agent.isPublic ? "outline" : "secondary"}>
                        {agent.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                  </div>
                  {agent.description && (
                    <CardDescription className="mt-1.5 line-clamp-2">
                      {agent.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      <span>{agent._count.kbLinks} KBs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Rocket className="h-3.5 w-3.5" />
                      <span>{agent._count.deployments} deployments</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{agent._count.conversations}</span>
                    </div>
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

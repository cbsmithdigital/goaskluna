import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  BookOpen,
  FileText,
  Globe,
  Mic,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      _count: {
        select: {
          agents: true,
          knowledgeBases: true,
          deployments: true,
          conversations: true,
        },
      },
    },
  });
  if (!org) redirect("/dashboard");

  // Get recent conversations
  const recentConversations = await db.conversation.findMany({
    where: { orgId: org.id },
    include: {
      agent: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  // Get document count
  const docCount = await db.document.count({
    where: { knowledgeBase: { orgId: org.id } },
  });

  const stats = [
    {
      label: "Active Agents",
      value: org._count.agents,
      icon: Bot,
      href: `admin/agents`,
    },
    {
      label: "Knowledge Bases",
      value: org._count.knowledgeBases,
      icon: BookOpen,
      href: `admin/knowledge-bases`,
    },
    {
      label: "Documents",
      value: docCount,
      icon: FileText,
      href: `admin/knowledge-bases`,
    },
    {
      label: "Deployments",
      value: org._count.deployments,
      icon: Globe,
      href: `admin/deployments`,
    },
    {
      label: "Conversations",
      value: org._count.conversations,
      icon: Mic,
      href: `admin/conversations`,
    },
    {
      label: "Minutes Used",
      value: Math.round(org.usedMinutes),
      icon: Clock,
      href: `admin/billing`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage {org.name}&apos;s knowledge base and agents
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/org/${orgSlug}/admin/agents/new`}>
            <Button>
              <Bot className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Usage warning */}
      {org.includedMinutes > 0 &&
        org.usedMinutes / org.includedMinutes > 0.8 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Usage Warning
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You&apos;ve used {Math.round(org.usedMinutes)} of{" "}
                {org.includedMinutes} included minutes (
                {Math.round((org.usedMinutes / org.includedMinutes) * 100)}%).
              </p>
            </div>
          </div>
        )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={`/org/${orgSlug}/${stat.href}`}>
            <Card className="group transition-all hover:border-primary/30 hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Conversations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Conversations</h2>
          <Link href={`/org/${orgSlug}/admin/conversations`}>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </div>
        {recentConversations.length === 0 ? (
          <Card className="flex items-center justify-center p-12">
            <div className="text-center">
              <Mic className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No conversations yet
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentConversations.map((conv) => (
              <Card key={conv.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{conv.agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.user?.name || conv.user?.email || "Anonymous"}{" "}
                        &middot;{" "}
                        {formatDistanceToNow(conv.startedAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        conv.status === "COMPLETED"
                          ? "secondary"
                          : conv.status === "ESCALATED"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {conv.status.toLowerCase()}
                    </Badge>
                    {conv.billableMinutes && (
                      <span className="text-xs text-muted-foreground">
                        {conv.billableMinutes.toFixed(1)} min
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

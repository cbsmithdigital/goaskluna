import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, FileText, BarChart3, Bot } from "lucide-react";
import Link from "next/link";

export default async function OrgHomePage({
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
          agents: { where: { isActive: true } },
          knowledgeBases: true,
          conversations: true,
        },
      },
    },
  });

  if (!org) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to {org.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your AI-powered knowledge assistant
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={`/org/${orgSlug}/talk`}>
          <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Talk to Agent
              </CardTitle>
              <Mic className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{org._count.agents}</p>
              <p className="text-xs text-muted-foreground">active agents</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/org/${orgSlug}/docs`}>
          <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{org._count.knowledgeBases}</p>
              <p className="text-xs text-muted-foreground">knowledge bases</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/org/${orgSlug}/history`}>
          <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversations
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{org._count.conversations}</p>
              <p className="text-xs text-muted-foreground">total sessions</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="flex items-center justify-center border-dashed p-6">
          <div className="text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Start a conversation
            </p>
            <Link href={`/org/${orgSlug}/talk`}>
              <Button size="sm" className="mt-3">
                Get Started
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

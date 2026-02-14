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
import { BookOpen, FileText, FolderOpen } from "lucide-react";

export default async function DocsPage({
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Browse your organization&apos;s knowledge base
        </p>
      </div>

      {/* Knowledge Base Grid */}
      {knowledgeBases.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            No knowledge bases available
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact your admin to set up knowledge bases for your organization.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <Link key={kb.id} href={`/org/${orgSlug}/docs/${kb.id}`}>
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-bold leading-tight">
                        {kb.name}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={kb.type === "PUBLIC" ? "outline" : "secondary"}
                    >
                      {kb.type}
                    </Badge>
                  </div>
                  {kb.description && (
                    <CardDescription className="mt-1.5 line-clamp-2">
                      {kb.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>
                      {kb._count.documents}{" "}
                      {kb._count.documents === 1 ? "document" : "documents"}
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

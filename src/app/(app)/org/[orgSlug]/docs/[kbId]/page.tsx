import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Globe,
  FolderOpen,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return <FileText className="h-8 w-8 text-blue-500" />;
  }
  if (mimeType === "text/html") {
    return <Globe className="h-8 w-8 text-orange-500" />;
  }
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") {
    return <BookOpen className="h-8 w-8 text-purple-500" />;
  }
  return <FileText className="h-8 w-8 text-muted-foreground" />;
}

export default async function KBDocumentsPage({
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

  const kb = await db.knowledgeBase.findFirst({
    where: { id: kbId, orgId: org.id },
  });

  if (!kb) redirect(`/org/${orgSlug}/docs`);

  const documents = await db.document.findMany({
    where: { knowledgeBaseId: kbId, status: "READY" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href={`/org/${orgSlug}/docs`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Button>
      </Link>

      {/* KB Header */}
      <div>
        <div className="flex items-start gap-3">
          <BookOpen className="mt-1 h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{kb.name}</h1>
            {kb.description && (
              <p className="mt-1 text-muted-foreground">{kb.description}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Badge
                variant={kb.type === "PUBLIC" ? "outline" : "secondary"}
              >
                {kb.type}
              </Badge>
              <Badge variant="outline">{kb.visibility.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Document List */}
      {documents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No documents available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This knowledge base doesn&apos;t have any documents ready yet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="transition-all hover:shadow-sm">
              <CardHeader className="pb-0">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 pt-0.5">{getFileIcon(doc.mimeType)}</div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {doc.title}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{formatBytes(doc.fileSizeBytes)}</span>
                      <span>{doc.fileName}</span>
                      <span>
                        Uploaded{" "}
                        {doc.createdAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge variant="default" className="shrink-0">
                    Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

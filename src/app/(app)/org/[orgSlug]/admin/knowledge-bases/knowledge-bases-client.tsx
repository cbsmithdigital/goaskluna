"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  FileText,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { KBType, KBVisibility } from "@prisma/client";

interface SerializedKnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  type: KBType;
  visibility: KBVisibility;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    documents: number;
  };
}

interface KnowledgeBasesClientProps {
  knowledgeBases: SerializedKnowledgeBase[];
  orgId: string;
  orgSlug: string;
}

const visibilityConfig: Record<
  KBVisibility,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ALL_EMPLOYEES: { label: "All Employees", variant: "secondary" },
  MANAGERS_ONLY: { label: "Managers Only", variant: "default" },
  HR_ONLY: { label: "HR Only", variant: "destructive" },
  PUBLIC: { label: "Public", variant: "outline" },
};

export function KnowledgeBasesClient({
  knowledgeBases,
  orgId,
  orgSlug,
}: KnowledgeBasesClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<KBType>("INTERNAL");
  const [visibility, setVisibility] = useState<KBVisibility>("ALL_EMPLOYEES");

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("INTERNAL");
    setVisibility("ALL_EMPLOYEES");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/knowledge-bases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          visibility,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to create knowledge base");
      }

      setDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      console.error("Failed to create knowledge base:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Knowledge Bases
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your document collections for AI agent training
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Knowledge Base
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
              <DialogDescription>
                Add a new knowledge base to organize your documents. Agents can
                be linked to one or more knowledge bases.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="kb-name">Name</Label>
                <Input
                  id="kb-name"
                  placeholder="e.g., Employee Handbook"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-description">Description</Label>
                <Textarea
                  id="kb-description"
                  placeholder="Describe the purpose of this knowledge base..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as KBType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as KBVisibility)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_EMPLOYEES">
                        All Employees
                      </SelectItem>
                      <SelectItem value="MANAGERS_ONLY">
                        Managers Only
                      </SelectItem>
                      <SelectItem value="HR_ONLY">HR Only</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {knowledgeBases.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            No knowledge bases yet
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create your first knowledge base to start uploading documents and
            training your AI agents.
          </p>
          <Button className="mt-6" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Knowledge Base
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-center">Documents</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {knowledgeBases.map((kb) => (
                <TableRow key={kb.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{kb.name}</p>
                      {kb.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {kb.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        kb.type === "INTERNAL" ? "secondary" : "outline"
                      }
                    >
                      {kb.type.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={visibilityConfig[kb.visibility].variant}>
                      {visibilityConfig[kb.visibility].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{kb._count.documents}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {kb.lastSyncedAt ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        {formatDistanceToNow(new Date(kb.lastSyncedAt), {
                          addSuffix: true,
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Never
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/org/${orgSlug}/admin/knowledge-bases/${kb.id}`}
                    >
                      <Button variant="ghost" size="sm">
                        Manage
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

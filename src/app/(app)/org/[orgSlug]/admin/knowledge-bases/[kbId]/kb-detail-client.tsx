"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft,
  Upload,
  FileText,
  Pencil,
  RefreshCw,
  CheckCircle2,
  Loader2,
  XCircle,
  CloudUpload,
  File,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { KBType, KBVisibility, DocStatus } from "@prisma/client";

// ---------- Types ----------

interface SerializedKnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  type: KBType;
  visibility: KBVisibility;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SerializedDocument {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: DocStatus;
  statusMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBaseDetailClientProps {
  knowledgeBase: SerializedKnowledgeBase;
  documents: SerializedDocument[];
  orgId: string;
  orgSlug: string;
}

// ---------- Helpers ----------

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/html",
];

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.md,.html";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

const statusConfig: Record<
  DocStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CheckCircle2;
  }
> = {
  READY: { label: "Ready", variant: "secondary", icon: CheckCircle2 },
  PROCESSING: { label: "Processing", variant: "default", icon: Loader2 },
  FAILED: { label: "Failed", variant: "destructive", icon: XCircle },
  UPLOADING: { label: "Uploading", variant: "outline", icon: CloudUpload },
  ARCHIVED: { label: "Archived", variant: "outline", icon: FileText },
};

const visibilityConfig: Record<
  KBVisibility,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ALL_EMPLOYEES: { label: "All Employees", variant: "secondary" },
  MANAGERS_ONLY: { label: "Managers Only", variant: "default" },
  HR_ONLY: { label: "HR Only", variant: "destructive" },
  PUBLIC: { label: "Public", variant: "outline" },
};

// ---------- Component ----------

export function KnowledgeBaseDetailClient({
  knowledgeBase,
  documents,
  orgId,
  orgSlug,
}: KnowledgeBaseDetailClientProps) {
  const router = useRouter();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(knowledgeBase.name);
  const [editDescription, setEditDescription] = useState(
    knowledgeBase.description ?? ""
  );
  const [editType, setEditType] = useState<KBType>(knowledgeBase.type);
  const [editVisibility, setEditVisibility] = useState<KBVisibility>(
    knowledgeBase.visibility
  );
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- Edit handlers ----------

  const handleEdit = async () => {
    if (!editName.trim()) return;

    setIsEditSubmitting(true);
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/knowledge-bases/${knowledgeBase.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            description: editDescription.trim() || null,
            type: editType,
            visibility: editVisibility,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update knowledge base");
      }

      setEditDialogOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to update knowledge base:", err);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // ---------- Upload handlers ----------

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files).filter(
          (f) =>
            ACCEPTED_FILE_TYPES.includes(f.type) ||
            f.name.endsWith(".md") ||
            f.name.endsWith(".txt")
        );
        setSelectedFiles(files);
      }
    },
    []
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        setUploadStatus(`Uploading ${file.name} (${i + 1}/${totalFiles})...`);

        // Step 1: Request presigned URL from our API
        const metaRes = await fetch(
          `/api/orgs/${orgId}/knowledge-bases/${knowledgeBase.id}/documents`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: file.name.replace(/\.[^/.]+$/, ""),
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              fileSizeBytes: file.size,
            }),
          }
        );

        if (!metaRes.ok) {
          const error = await metaRes.json().catch(() => ({}));
          throw new Error(
            error.message || `Failed to initiate upload for ${file.name}`
          );
        }

        const { documentId, presignedUrl } = await metaRes.json();

        // Step 2: Upload file to presigned URL
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name} to storage`);
        }

        // Step 3: Confirm upload to trigger processing
        const confirmRes = await fetch(`/api/documents/confirm-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        if (!confirmRes.ok) {
          const error = await confirmRes.json().catch(() => ({}));
          throw new Error(
            error.message ||
              `Failed to confirm upload for ${file.name}`
          );
        }

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setUploadStatus("All files uploaded successfully!");
      setSelectedFiles([]);

      // Brief delay so user sees success message
      setTimeout(() => {
        setUploadDialogOpen(false);
        setUploadStatus("");
        setUploadProgress(0);
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadStatus(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/knowledge-bases/${knowledgeBase.id}/documents/${docId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to delete document");
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href={`/org/${orgSlug}/admin/knowledge-bases`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Knowledge Bases
      </Link>

      {/* KB Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{knowledgeBase.name}</CardTitle>
              {knowledgeBase.description && (
                <p className="text-sm text-muted-foreground">
                  {knowledgeBase.description}
                </p>
              )}
            </div>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Knowledge Base</DialogTitle>
                  <DialogDescription>
                    Update the details for this knowledge base.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-kb-name">Name</Label>
                    <Input
                      id="edit-kb-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-kb-description">Description</Label>
                    <Textarea
                      id="edit-kb-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editType}
                        onValueChange={(v) => setEditType(v as KBType)}
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
                        value={editVisibility}
                        onValueChange={(v) =>
                          setEditVisibility(v as KBVisibility)
                        }
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
                    onClick={() => setEditDialogOpen(false)}
                    disabled={isEditSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEdit}
                    disabled={!editName.trim() || isEditSubmitting}
                  >
                    {isEditSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={
                knowledgeBase.type === "INTERNAL" ? "secondary" : "outline"
              }
            >
              {knowledgeBase.type.toLowerCase()}
            </Badge>
            <Badge variant={visibilityConfig[knowledgeBase.visibility].variant}>
              {visibilityConfig[knowledgeBase.visibility].label}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </div>
            {knowledgeBase.lastSyncedAt && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                Synced{" "}
                {formatDistanceToNow(new Date(knowledgeBase.lastSyncedAt), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documents</h2>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload documents to this knowledge base. Supported formats:
                  PDF, DOCX, TXT, Markdown, and HTML.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Drop zone / file picker */}
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files) {
                      const files = Array.from(e.dataTransfer.files).filter(
                        (f) =>
                          ACCEPTED_FILE_TYPES.includes(f.type) ||
                          f.name.endsWith(".md") ||
                          f.name.endsWith(".txt")
                      );
                      setSelectedFiles((prev) => [...prev, ...files]);
                    }
                  }}
                >
                  <CloudUpload className="h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium">
                    Click to browse or drag files here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, DOCX, TXT, MD, HTML
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Selected files list */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      Selected Files ({selectedFiles.length})
                    </Label>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{file.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-center text-xs text-muted-foreground">
                      {uploadStatus}
                    </p>
                  </div>
                )}

                {/* Upload error/success status when not uploading */}
                {!isUploading && uploadStatus && (
                  <p
                    className={`text-center text-sm ${
                      uploadStatus.includes("successfully")
                        ? "text-green-600 dark:text-green-400"
                        : "text-destructive"
                    }`}
                  >
                    {uploadStatus}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedFiles([]);
                    setUploadStatus("");
                    setUploadProgress(0);
                  }}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {documents.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Upload your first document to start building this knowledge base.
              Your AI agents will use these documents to answer questions.
            </p>
            <Button
              className="mt-6"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Documents
            </Button>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const status = statusConfig[doc.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <p className="font-medium">{doc.title}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {doc.fileName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className="gap-1"
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${
                              doc.status === "PROCESSING"
                                ? "animate-spin"
                                : ""
                            }`}
                          />
                          {status.label}
                        </Badge>
                        {doc.statusMessage && doc.status === "FAILED" && (
                          <p className="mt-1 text-xs text-destructive">
                            {doc.statusMessage}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(doc.fileSizeBytes)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(doc.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

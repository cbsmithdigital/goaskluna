import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { createAuditLog } from "@/lib/audit";
import { uploadFile, getDocumentPath, deleteFile } from "@/lib/storage";
import { NotFoundError } from "@/lib/errors";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/html",
  "text/plain",
  "text/markdown",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const GET = withOrgPermission("kb:read", async (req, { orgId }) => {
  const url = new URL(req.url);
  const kbId = url.pathname.split("/knowledge-bases/")[1]?.split("/")[0];

  const kb = await db.knowledgeBase.findFirst({
    where: { id: kbId, orgId },
  });
  if (!kb) throw new NotFoundError("Knowledge Base");

  const documents = await db.document.findMany({
    where: { knowledgeBaseId: kbId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(documents);
});

export const POST = withOrgPermission("docs:upload", async (req, { orgId, userId }) => {
  const url = new URL(req.url);
  const kbId = url.pathname.split("/knowledge-bases/")[1]?.split("/")[0];

  const kb = await db.knowledgeBase.findFirst({
    where: { id: kbId, orgId },
  });
  if (!kb) throw new NotFoundError("Knowledge Base");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const visibilityOverride = formData.get("visibilityOverride") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!title || title.length === 0) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds maximum size of 50MB" },
      { status: 400 },
    );
  }

  // Upload to Vercel Blob
  const pathname = getDocumentPath(orgId, file.name);
  const blobUrl = await uploadFile(pathname, file as Blob, { contentType: file.type });

  // Create document record
  const doc = await db.document.create({
    data: {
      knowledgeBaseId: kbId,
      title,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      blobUrl,
      status: "UPLOADING",
      visibilityOverride: visibilityOverride as any ?? undefined,
      uploadedById: userId,
    },
  });

  await createAuditLog({
    orgId,
    userId,
    action: "document.upload_initiated",
    entityType: "Document",
    entityId: doc.id,
    metadata: { title, fileName: file.name },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
});

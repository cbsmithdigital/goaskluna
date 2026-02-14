import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { processDocument } from "@/lib/ingestion/pipeline";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const userId = session.user.id;
    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const doc = await db.document.findUnique({
      where: { id: documentId },
      include: {
        knowledgeBase: {
          include: { organization: true },
        },
      },
    });

    if (!doc) throw new NotFoundError("Document");
    if (doc.status !== "UPLOADING") {
      return NextResponse.json(
        { error: "Document is not in UPLOADING status" },
        { status: 400 },
      );
    }

    // Update status to PROCESSING
    await db.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    // Fire and forget document processing
    processDocument(documentId).catch(console.error);

    await createAuditLog({
      orgId: doc.knowledgeBase.orgId,
      userId,
      action: "document.upload_confirmed",
      entityType: "Document",
      entityId: documentId,
    });

    return NextResponse.json({ status: "PROCESSING" });
  } catch (error) {
    return handleApiError(error);
  }
}

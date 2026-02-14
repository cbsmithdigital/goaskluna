/**
 * Document ingestion pipeline (simplified)
 * Orchestrates: download → parse → send to ElevenLabs KB
 */

import { db } from "../db";
import { parseDocument } from "./parser";
import { addDocumentToKB, removeDocumentFromKB } from "../elevenlabs/client";

export interface PipelineResult {
  documentId: string;
  versionId: string;
  processingTimeMs: number;
  status: "success" | "failed";
  error?: string;
}

/**
 * Run the document ingestion pipeline.
 * Downloads the file, parses it to text, creates a version,
 * and syncs to ElevenLabs KB for voice agent retrieval.
 */
export async function processDocument(
  documentId: string,
): Promise<PipelineResult> {
  const startTime = Date.now();

  try {
    // 1. Fetch document record
    const doc = await db.document.findUnique({
      where: { id: documentId },
      include: {
        knowledgeBase: {
          select: { id: true, orgId: true, elevenLabsKbId: true },
        },
      },
    });

    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // 2. Download file from Vercel Blob
    const response = await fetch(doc.blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // 3. Parse document to plain text
    const parseResult = await parseDocument(buffer, doc.mimeType, doc.fileName);

    if (!parseResult.text || parseResult.text.trim().length === 0) {
      throw new Error("Document produced no text content after parsing");
    }

    // 4. Create new document version
    const prevVersion = await db.docVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: "desc" },
    });

    const versionNumber = (prevVersion?.versionNumber || 0) + 1;

    const docVersion = await db.docVersion.create({
      data: {
        documentId,
        versionNumber,
        blobUrl: doc.blobUrl,
        fileSizeBytes: doc.fileSizeBytes,
        rawText: parseResult.text,
        processingTimeMs: Date.now() - startTime,
      },
    });

    // 5. Sync to ElevenLabs KB (if KB has an ElevenLabs counterpart)
    const kb = doc.knowledgeBase;
    if (kb.elevenLabsKbId) {
      // Remove old ElevenLabs document if it exists
      if (prevVersion?.elevenLabsDocId) {
        try {
          await removeDocumentFromKB(kb.elevenLabsKbId, prevVersion.elevenLabsDocId);
        } catch {
          // Old doc may already be removed
        }
      }

      const result = await addDocumentToKB(kb.elevenLabsKbId, {
        name: doc.fileName,
        content: parseResult.text,
        mimeType: doc.mimeType,
      });

      await db.docVersion.update({
        where: { id: docVersion.id },
        data: { elevenLabsDocId: result.document_id },
      });
    }

    // 6. Update document status
    await db.document.update({
      where: { id: documentId },
      data: {
        status: "READY",
        currentVersionId: docVersion.id,
        statusMessage: null,
      },
    });

    return {
      documentId,
      versionId: docVersion.id,
      processingTimeMs: Date.now() - startTime,
      status: "success",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        statusMessage: errorMessage,
      },
    });

    return {
      documentId,
      versionId: "",
      processingTimeMs: Date.now() - startTime,
      status: "failed",
      error: errorMessage,
    };
  }
}

/**
 * Document parsing utilities
 * Extracts plain text from various file formats
 */

export interface ParseResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, string>;
}

/**
 * Parse a document buffer into plain text based on MIME type
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParseResult> {
  switch (mimeType) {
    case "application/pdf":
      return parsePDF(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDOCX(buffer);

    case "text/html":
      return parseHTML(buffer.toString("utf-8"));

    case "text/plain":
    case "text/markdown":
      return { text: buffer.toString("utf-8") };

    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
}

async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  // Dynamic import for pdf-parse (heavy dependency)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(buffer);

  return {
    text: result.text,
    pageCount: result.numpages,
    metadata: {
      title: result.info?.Title || "",
      author: result.info?.Author || "",
    },
  };
}

async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  // Dynamic import for mammoth
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value,
  };
}

function parseHTML(html: string): ParseResult {
  // Simple HTML to text conversion
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  return { text };
}

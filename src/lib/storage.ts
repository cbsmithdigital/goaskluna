import { put, del } from "@vercel/blob";

/**
 * Upload a file to Vercel Blob storage.
 * Returns the public URL of the uploaded blob.
 */
export async function uploadFile(
  path: string,
  file: Buffer | ReadableStream | Blob,
  options?: { contentType?: string },
): Promise<string> {
  const blob = await put(path, file, {
    access: "public",
    contentType: options?.contentType,
  });
  return blob.url;
}

/**
 * Delete a file from Vercel Blob storage.
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

/**
 * Generate a storage path for a document.
 */
export function getDocumentPath(orgId: string, fileName: string): string {
  return `orgs/${orgId}/docs/${Date.now()}-${fileName}`;
}

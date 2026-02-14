import { Prisma } from "@prisma/client";
import { db } from "./db";

interface AuditLogParams {
  orgId?: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog({
  orgId,
  userId,
  action,
  entityType,
  entityId,
  metadata = {},
  ipAddress,
  userAgent,
}: AuditLogParams): Promise<void> {
  await db.auditLog.create({
    data: {
      orgId: orgId ?? undefined,
      userId,
      action,
      entityType,
      entityId,
      metadata: metadata as Prisma.InputJsonValue,
      ipAddress,
      userAgent,
    },
  });
}

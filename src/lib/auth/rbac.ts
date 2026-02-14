import { auth } from "./config";
import { db } from "../db";
import { ForbiddenError, UnauthorizedError } from "../errors";
import type { OrgRole } from "@prisma/client";

export type Permission =
  | "org:manage"
  | "org:members:manage"
  | "kb:manage"
  | "kb:read"
  | "agent:manage"
  | "agent:use"
  | "deployment:manage"
  | "analytics:view_all"
  | "analytics:view_team"
  | "billing:manage"
  | "conversations:view_all"
  | "conversations:view_own"
  | "tickets:manage"
  | "marketplace:install"
  | "docs:upload"
  | "docs:read";

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  ORG_ADMIN: [
    "org:manage",
    "org:members:manage",
    "kb:manage",
    "kb:read",
    "agent:manage",
    "agent:use",
    "deployment:manage",
    "analytics:view_all",
    "analytics:view_team",
    "billing:manage",
    "conversations:view_all",
    "conversations:view_own",
    "tickets:manage",
    "marketplace:install",
    "docs:upload",
    "docs:read",
  ],
  MANAGER: [
    "kb:read",
    "agent:use",
    "analytics:view_team",
    "conversations:view_all",
    "conversations:view_own",
    "tickets:manage",
    "docs:read",
  ],
  EMPLOYEE: [
    "kb:read",
    "agent:use",
    "conversations:view_own",
    "docs:read",
  ],
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get the current authenticated user's ID from NextAuth session.
 * Throws UnauthorizedError if not authenticated.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  return { userId: session.user.id };
}

/**
 * Require the user to be a super admin.
 */
export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const { userId } = await requireAuth();

  const user = await db.platformUser.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    throw new ForbiddenError("Super admin access required");
  }

  return { userId };
}

/**
 * Require the user to be a member of the specified org with a given permission.
 */
export async function requireOrgPermission(
  orgId: string,
  permission: Permission,
): Promise<{ userId: string; orgRole: OrgRole; membershipId: string }> {
  const { userId } = await requireAuth();

  const user = await db.platformUser.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    return { userId, orgRole: "ORG_ADMIN" as OrgRole, membershipId: "super-admin" };
  }

  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { id: true, role: true },
  });

  if (!membership) {
    throw new ForbiddenError("Not a member of this organization");
  }

  if (!hasPermission(membership.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return { userId, orgRole: membership.role, membershipId: membership.id };
}

/**
 * Require the user to be a member of the org (any role).
 */
export async function requireOrgMember(
  orgId: string,
): Promise<{ userId: string; orgRole: OrgRole }> {
  const { userId } = await requireAuth();

  const user = await db.platformUser.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    return { userId, orgRole: "ORG_ADMIN" as OrgRole };
  }

  const membership = await db.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  });

  if (!membership) {
    throw new ForbiddenError("Not a member of this organization");
  }

  return { userId, orgRole: membership.role };
}

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "../errors";
import { requireAuth, requireSuperAdmin, requireOrgPermission, type Permission } from "./rbac";
import type { OrgRole } from "@prisma/client";

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  req: NextRequest,
  context: RouteContext & {
    userId: string;
  },
) => Promise<NextResponse>;

type OrgHandler = (
  req: NextRequest,
  context: RouteContext & {
    userId: string;
    orgId: string;
    orgRole: OrgRole;
  },
) => Promise<NextResponse>;

type SuperAdminHandler = (
  req: NextRequest,
  context: RouteContext & {
    userId: string;
  },
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with authentication check
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const { userId } = await requireAuth();
      return await handler(req, { ...context, userId });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Wrap an API route handler with org membership + permission check
 */
export function withOrgPermission(permission: Permission, handler: OrgHandler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const params = await context.params;
      const orgId = params.orgId;
      if (!orgId) {
        return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
      }

      const { userId, orgRole } = await requireOrgPermission(orgId, permission);
      return await handler(req, { ...context, userId, orgId, orgRole });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Wrap an API route handler with super admin check
 */
export function withSuperAdmin(handler: SuperAdminHandler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      const { userId } = await requireSuperAdmin();
      return await handler(req, { ...context, userId });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

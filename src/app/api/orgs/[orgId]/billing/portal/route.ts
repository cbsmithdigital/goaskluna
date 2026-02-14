import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withOrgPermission } from "@/lib/auth/guards";
import { createPortalSession } from "@/lib/stripe";
import { AppError } from "@/lib/errors";

export const POST = withOrgPermission("billing:manage", async (req, { orgId }) => {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true, slug: true },
  });

  if (!org?.stripeCustomerId) {
    throw new AppError("No billing account configured", 400);
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/org/${org.slug}/admin/billing`;
  const portalUrl = await createPortalSession(org.stripeCustomerId, returnUrl);

  return NextResponse.json({ url: portalUrl });
});

import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.platformUser.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: { organization: true },
        take: 1,
      },
    },
  });

  // Super admins without an org go to the admin panel
  if (user?.isSuperAdmin && !user.memberships[0]) {
    redirect("/admin");
  }

  // Regular users with an org go to their org
  if (user?.memberships[0]) {
    redirect(`/org/${user.memberships[0].organization.slug}`);
  }

  // No org yet - redirect to onboarding
  redirect("/onboarding");
}

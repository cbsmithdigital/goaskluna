import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Find user's first org membership and redirect there
  const user = await db.platformUser.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: { organization: true },
        take: 1,
      },
    },
  });

  if (user?.memberships[0]) {
    redirect(`/org/${user.memberships[0].organization.slug}`);
  }

  // No org yet - redirect to onboarding
  redirect("/onboarding");
}

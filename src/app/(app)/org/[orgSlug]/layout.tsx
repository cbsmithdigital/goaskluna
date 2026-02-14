import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import type { OrgRole } from "@prisma/client";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  const user = await db.platformUser.findUnique({
    where: { id: userId },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    redirect("/dashboard");
  }

  let role: OrgRole = "EMPLOYEE";

  if (user.isSuperAdmin) {
    role = "ORG_ADMIN";
  } else {
    const membership = await db.orgMembership.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
    });

    if (!membership) {
      redirect("/dashboard");
    }

    role = membership.role;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar orgSlug={orgSlug} role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

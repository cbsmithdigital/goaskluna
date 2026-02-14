import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CreateOrgForm } from "@/components/onboarding/create-org-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/sign-in");

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-lg px-4 text-center">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            LUNA
          </span>
        </h1>
        <p className="mb-8 text-muted-foreground">
          Create your organization to get started
        </p>
        <CreateOrgForm />
        {user?.isSuperAdmin && (
          <div className="mt-6">
            <Link href="/admin">
              <Button variant="outline" className="gap-2">
                <Shield className="h-4 w-4" />
                Go to Super Admin Panel
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

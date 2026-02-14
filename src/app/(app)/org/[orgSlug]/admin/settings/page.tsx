import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      billingEmail: true,
    },
  });
  if (!org) redirect("/dashboard");

  return (
    <SettingsClient
      orgId={org.id}
      initialName={org.name}
      slug={org.slug}
      initialBillingEmail={org.billingEmail ?? ""}
    />
  );
}

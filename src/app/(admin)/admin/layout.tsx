import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  CreditCard,
  Store,
  BarChart3,
  ScrollText,
  LayoutDashboard,
} from "lucide-react";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await db.platformUser.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/admin/organizations", icon: Building2 },
    { label: "Billing Plans", href: "/admin/billing-plans", icon: CreditCard },
    { label: "Marketplace", href: "/admin/marketplace", icon: Store },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Super Admin Sidebar */}
      <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive">
            <span className="text-sm font-bold text-destructive-foreground">
              SA
            </span>
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight">LUNA</span>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-end border-b border-border bg-background/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Mic,
  FileText,
  History,
  Settings,
  Users,
  Bot,
  Globe,
  BarChart3,
  CreditCard,
  Store,
  Ticket,
  BookOpen,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  orgSlug: string;
  role: "ORG_ADMIN" | "MANAGER" | "EMPLOYEE";
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Array<"ORG_ADMIN" | "MANAGER" | "EMPLOYEE">;
}

export function Sidebar({ orgSlug, role }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/org/${orgSlug}`;

  const mainNav: NavItem[] = [
    { label: "Home", href: basePath, icon: LayoutDashboard },
    { label: "Talk to Agent", href: `${basePath}/talk`, icon: Mic },
    { label: "Documents", href: `${basePath}/docs`, icon: FileText },
    { label: "History", href: `${basePath}/history`, icon: History },
  ];

  const adminNav: NavItem[] = [
    {
      label: "Dashboard",
      href: `${basePath}/admin`,
      icon: LayoutDashboard,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Knowledge Bases",
      href: `${basePath}/admin/knowledge-bases`,
      icon: BookOpen,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Agents",
      href: `${basePath}/admin/agents`,
      icon: Bot,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Deployments",
      href: `${basePath}/admin/deployments`,
      icon: Globe,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Members",
      href: `${basePath}/admin/members`,
      icon: Users,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Analytics",
      href: `${basePath}/admin/analytics`,
      icon: BarChart3,
      roles: ["ORG_ADMIN", "MANAGER"],
    },
    {
      label: "Conversations",
      href: `${basePath}/admin/conversations`,
      icon: Mic,
      roles: ["ORG_ADMIN", "MANAGER"],
    },
    {
      label: "Tickets",
      href: `${basePath}/admin/tickets`,
      icon: Ticket,
      roles: ["ORG_ADMIN", "MANAGER"],
    },
    {
      label: "Marketplace",
      href: `${basePath}/admin/marketplace`,
      icon: Store,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Billing",
      href: `${basePath}/admin/billing`,
      icon: CreditCard,
      roles: ["ORG_ADMIN"],
    },
    {
      label: "Settings",
      href: `${basePath}/admin/settings`,
      icon: Settings,
      roles: ["ORG_ADMIN"],
    },
  ];

  const filteredAdminNav = adminNav.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">L</span>
        </div>
        <span className="text-lg font-semibold tracking-tight">LUNA</span>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== basePath && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin Navigation */}
        {filteredAdminNav.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
            <nav className="space-y-1">
              {filteredAdminNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== `${basePath}/admin` &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </ScrollArea>
    </aside>
  );
}

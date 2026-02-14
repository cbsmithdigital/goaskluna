import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Bot, Mic, DollarSign, Store } from "lucide-react";

export default async function SuperAdminDashboard() {
  const [orgCount, userCount, agentCount, conversationCount, marketplaceCount] =
    await Promise.all([
      db.organization.count(),
      db.platformUser.count(),
      db.agent.count(),
      db.conversation.count(),
      db.marketplaceAgent.count({ where: { isPublished: true } }),
    ]);

  // Total usage across all orgs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentUsage = await db.usageRecord.aggregate({
    where: { createdAt: { gte: thirtyDaysAgo } },
    _sum: { minutes: true, costCents: true },
  });

  const stats = [
    { label: "Organizations", value: orgCount, icon: Building2 },
    { label: "Total Users", value: userCount, icon: Users },
    { label: "Active Agents", value: agentCount, icon: Bot },
    { label: "Total Conversations", value: conversationCount, icon: Mic },
    {
      label: "Revenue (30d)",
      value: `$${((recentUsage._sum.costCents || 0) / 100).toFixed(2)}`,
      icon: DollarSign,
    },
    {
      label: "Marketplace Agents",
      value: marketplaceCount,
      icon: Store,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Platform Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of the LUNA platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

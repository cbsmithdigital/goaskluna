import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Download } from "lucide-react";

export default async function MarketplacePage() {
  const agents = await db.marketplaceAgent.findMany({
    include: {
      _count: { select: { installs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Marketplace Agents
          </h1>
          <p className="text-muted-foreground">
            Manage the marketplace agent catalog
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/marketplace/new">
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Link key={agent.id} href={`/admin/marketplace/${agent.id}`}>
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{agent.name}</CardTitle>
                  <Badge
                    variant={agent.isPublished ? "default" : "secondary"}
                  >
                    {agent.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {agent.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Download className="mr-1 h-3 w-3" />
                    {agent._count.installs} installs
                  </Badge>
                  {agent.isFeatured && (
                    <Badge className="text-xs">Featured</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

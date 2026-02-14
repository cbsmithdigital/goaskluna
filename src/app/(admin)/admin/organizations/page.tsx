import { db } from "@/lib/db";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function OrganizationsPage() {
  const orgs = await db.organization.findMany({
    include: {
      _count: {
        select: {
          memberships: true,
          agents: true,
          conversations: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">
          All organizations on the platform
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Agents</TableHead>
              <TableHead>Conversations</TableHead>
              <TableHead>Usage (min)</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {org.slug}
                </TableCell>
                <TableCell>{org._count.memberships}</TableCell>
                <TableCell>{org._count.agents}</TableCell>
                <TableCell>{org._count.conversations}</TableCell>
                <TableCell>{Math.round(org.usedMinutes)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      org.stripeSubscriptionId ? "default" : "secondary"
                    }
                  >
                    {org.stripeSubscriptionId ? "Active" : "Free"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {org.createdAt.toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

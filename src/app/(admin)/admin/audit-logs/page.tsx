import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AuditLogsPage() {
  const logs = await db.auditLog.findMany({
    include: {
      user: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Platform-wide activity log
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {log.createdAt.toLocaleString()}
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">
                    {log.user.name || log.user.email}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.organization?.name || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.entityType}
                  {log.entityId && (
                    <span className="ml-1 text-xs">
                      ({log.entityId.slice(0, 8)}...)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log.ipAddress || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

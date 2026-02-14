"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

interface UsageRecord {
  id: string;
  minutes: number;
  costCents: number;
  agentName: string;
  createdAt: string;
}

interface BillingClientProps {
  orgId: string;
  includedMinutes: number;
  usedMinutes: number;
  hardCutoff: boolean;
  graceNotified: boolean;
  totalMinutes: number;
  totalCostCents: number;
  records: UsageRecord[];
}

// ─── Helpers ──────────────────────────────────────────────────

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function usageColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function usageTextColor(pct: number): string {
  if (pct >= 90) return "text-red-600 dark:text-red-400";
  if (pct >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

// ─── Component ────────────────────────────────────────────────

export function BillingClient({
  orgId,
  includedMinutes,
  usedMinutes,
  totalMinutes,
  totalCostCents,
  records,
}: BillingClientProps) {
  const [portalLoading, setPortalLoading] = useState(false);

  const usagePct =
    includedMinutes > 0
      ? Math.min((usedMinutes / includedMinutes) * 100, 100)
      : 0;

  const remaining = Math.max(includedMinutes - usedMinutes, 0);

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/billing/portal`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.message || "Failed to open billing portal"
        );
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Billing portal error:", err);
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Billing &amp; Usage
          </h1>
          <p className="mt-1 text-muted-foreground">
            Monitor your usage and manage your subscription
          </p>
        </div>
        <Button onClick={handleManageBilling} disabled={portalLoading}>
          {portalLoading ? (
            <>
              <CreditCard className="mr-2 h-4 w-4 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Billing
            </>
          )}
        </Button>
      </div>

      {/* Usage Warning */}
      {includedMinutes > 0 && usagePct >= 80 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Usage Warning
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            You have used {Math.round(usagePct)}% of your included minutes.
            {usagePct >= 100
              ? " You have exceeded your included minutes. Additional usage will be billed at the overage rate."
              : " Consider upgrading your plan to avoid overage charges."}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>
            Current billing period usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {usedMinutes.toFixed(1)} / {includedMinutes} minutes
              </span>
              <span className={`font-semibold ${usageTextColor(usagePct)}`}>
                {usagePct.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usageColor(usagePct)}`}
                style={{ width: `${Math.min(usagePct, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-xl font-bold">
                  {totalMinutes.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Minutes Remaining
                </p>
                <p className="text-xl font-bold">{remaining.toFixed(1)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-bold">
                  {formatCost(totalCostCents)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Usage Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Usage</CardTitle>
          <CardDescription>
            Last 30 days of usage records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No usage records for this period
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Minutes</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.agentName}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.minutes.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCost(record.costCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

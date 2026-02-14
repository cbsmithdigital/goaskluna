"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Clock,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  PhoneForwarded,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────

interface AnalyticsSummary {
  totalSessions: number;
  totalMinutes: number;
  totalMessages: number;
  noAnswerTotal: number;
  noAnswerRate: number;
  escalationCount: number;
  escalationRate: number;
  avgDurationSeconds: number;
  estimatedCostCents: number;
}

interface DayData {
  sessions: number;
  minutes: number;
}

interface AgentData {
  sessions: number;
  minutes: number;
}

interface AnalyticsResponse {
  summary: AnalyticsSummary;
  byAgent: Record<string, AgentData>;
  byDay: Record<string, DayData>;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatAvgDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────

const DAY_OPTIONS = [7, 30, 90] as const;

export function AnalyticsClient({
  orgId,
  agentNames,
}: {
  orgId: string;
  agentNames: Record<string, string>;
}) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/analytics/overview?days=${days}`
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      const json: AnalyticsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [orgId, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build chart data from full date range
  const dateRange = generateDateRange(days);
  const chartData = dateRange.map((date) => ({
    date,
    sessions: data?.byDay[date]?.sessions ?? 0,
  }));
  const maxSessions = Math.max(...chartData.map((d) => d.sessions), 1);

  // By-agent table data
  const agentRows = data
    ? Object.entries(data.byAgent)
        .map(([agentId, stats]) => ({
          agentId,
          name: agentNames[agentId] || agentId.slice(0, 8),
          sessions: stats.sessions,
          minutes: stats.minutes,
          pctOfTotal:
            data.summary.totalSessions > 0
              ? (stats.sessions / data.summary.totalSessions) * 100
              : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions)
    : [];

  // Stats cards config
  const statCards = data
    ? [
        {
          title: "Total Sessions",
          value: data.summary.totalSessions.toLocaleString(),
          icon: Activity,
        },
        {
          title: "Total Minutes",
          value: data.summary.totalMinutes.toFixed(1),
          icon: Clock,
        },
        {
          title: "Avg Duration",
          value: formatAvgDuration(data.summary.avgDurationSeconds),
          icon: MessageSquare,
        },
        {
          title: "No-Answer Rate",
          value: formatPercent(data.summary.noAnswerRate),
          icon: AlertTriangle,
        },
        {
          title: "Escalation Rate",
          value: formatPercent(data.summary.escalationRate),
          icon: PhoneForwarded,
        },
        {
          title: "Estimated Cost",
          value: formatCost(data.summary.estimatedCostCents),
          icon: DollarSign,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Voice agent performance overview
          </p>
        </div>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground/60" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Sessions Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions per Day</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-end gap-1" style={{ height: 200 }}>
              {Array.from({ length: Math.min(days, 30) }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className="flex items-end gap-[2px] sm:gap-1"
                style={{ height: 200 }}
              >
                {chartData.map((d) => {
                  const heightPct =
                    maxSessions > 0 ? (d.sessions / maxSessions) * 100 : 0;
                  return (
                    <div
                      key={d.date}
                      className="group relative flex flex-1 flex-col items-center justify-end"
                      style={{ height: "100%" }}
                    >
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow group-hover:block">
                        {d.sessions}
                      </div>
                      <div
                        className="w-full min-h-[2px] rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                        style={{ height: `${Math.max(heightPct, 1)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Date labels - show only a subset to prevent overlap */}
              <div className="flex gap-[2px] sm:gap-1">
                {chartData.map((d, i) => {
                  const showLabel =
                    days <= 7 ||
                    (days <= 30 && i % 5 === 0) ||
                    (days > 30 && i % 10 === 0) ||
                    i === chartData.length - 1;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 text-center text-[10px] text-muted-foreground"
                    >
                      {showLabel ? formatShortDate(d.date) : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By-Agent Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>By Agent</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : agentRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No agent data for this period
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Minutes</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentRows.map((row) => (
                  <TableRow key={row.agentId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">
                      {row.sessions}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.minutes.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.pctOfTotal.toFixed(1)}%
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

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────

interface ConversationUser {
  name: string | null;
  email: string;
}

interface ConversationAgent {
  name: string;
}

interface Conversation {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "ERRORED" | "ESCALATED";
  durationSeconds: number | null;
  billableMinutes: number | null;
  messageCount: number;
  noAnswerCount: number;
  wasEscalated: boolean;
  rating: number | null;
  feedback: string | null;
  startedAt: string;
  endedAt: string | null;
  agent: ConversationAgent;
  user: ConversationUser | null;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  limit: number;
  offset: number;
}

interface AgentOption {
  id: string;
  name: string;
}

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ERRORED" | "ESCALATED";

// ─── Helpers ──────────────────────────────────────────────────

function formatDurationShort(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

const STATUS_STYLES: Record<
  Conversation["status"],
  string
> = {
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ACTIVE:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ESCALATED:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ERRORED:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function ConversationsClient({
  orgId,
  agents,
}: {
  orgId: string;
  agents: AgentOption[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [agentId, setAgentId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Detail sheet
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
      });
      if (agentId !== "ALL") params.set("agentId", agentId);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(
        `/api/orgs/${orgId}/conversations?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to load conversations");
      const data: ConversationsResponse = await res.json();
      setConversations(data.conversations);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [orgId, offset, agentId, statusFilter]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [agentId, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="mt-1 text-muted-foreground">
          Browse and review voice agent conversations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="ERRORED">Errored</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {total} conversation{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b px-6 py-4 last:border-b-0"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">
                No conversations found
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conv) => (
                  <TableRow
                    key={conv.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedConv(conv)}
                  >
                    <TableCell className="font-medium">
                      {conv.user?.name || conv.user?.email || "Anonymous"}
                    </TableCell>
                    <TableCell>{conv.agent.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-transparent ${STATUS_STYLES[conv.status]}`}
                      >
                        {conv.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDurationShort(conv.durationSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {conv.messageCount}
                    </TableCell>
                    <TableCell>
                      <RatingStars rating={conv.rating} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.startedAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedConv}
        onOpenChange={(open) => {
          if (!open) setSelectedConv(null);
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selectedConv && (
            <>
              <SheetHeader>
                <SheetTitle>Conversation Details</SheetTitle>
                <SheetDescription>
                  {selectedConv.agent.name} &middot;{" "}
                  {formatDistanceToNow(new Date(selectedConv.startedAt), {
                    addSuffix: true,
                  })}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                {/* Status and meta */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`border-transparent ${STATUS_STYLES[selectedConv.status]}`}
                    >
                      {selectedConv.status.toLowerCase()}
                    </Badge>
                    {selectedConv.wasEscalated && (
                      <Badge variant="destructive">Escalated</Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">User</p>
                      <p className="text-sm font-medium">
                        {selectedConv.user?.name ||
                          selectedConv.user?.email ||
                          "Anonymous"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Agent</p>
                      <p className="text-sm font-medium">
                        {selectedConv.agent.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">
                        {formatDurationShort(selectedConv.durationSeconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Billable Minutes
                      </p>
                      <p className="text-sm font-medium">
                        {selectedConv.billableMinutes?.toFixed(2) ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Messages</p>
                      <p className="text-sm font-medium">
                        {selectedConv.messageCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        No-Answer Count
                      </p>
                      <p className="text-sm font-medium">
                        {selectedConv.noAnswerCount}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Rating */}
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Rating</p>
                    <RatingStars rating={selectedConv.rating} />
                  </div>

                  {selectedConv.feedback && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        Feedback
                      </p>
                      <p className="text-sm">{selectedConv.feedback}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Started</p>
                      <p className="text-sm">
                        {new Date(selectedConv.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ended</p>
                      <p className="text-sm">
                        {selectedConv.endedAt
                          ? new Date(selectedConv.endedAt).toLocaleString()
                          : "In progress"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

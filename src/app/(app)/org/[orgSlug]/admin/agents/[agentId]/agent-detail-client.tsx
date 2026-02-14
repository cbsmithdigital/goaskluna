"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Clock,
  Database,
  Rocket,
  Star,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------- Types ----------

interface KnowledgeBase {
  id: string;
  name: string;
  type: string;
}

interface AgentKBLink {
  id: string;
  knowledgeBaseId: string;
  knowledgeBase: KnowledgeBase;
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  voiceId: string | null;
  modelId: string | null;
  systemPrompt: string | null;
  greetingMessage: string | null;
  enablePiiGuardrails: boolean;
  enableEscalation: boolean;
  escalationMessage: string | null;
  maxSessionMinutes: number;
  language: string;
  isPublic: boolean;
  isActive: boolean;
  kbLinks: AgentKBLink[];
  _count: {
    conversations: number;
    deployments: number;
  };
  createdAt: string;
}

interface Conversation {
  id: string;
  status: string;
  durationSeconds: number | null;
  messageCount: number;
  wasEscalated: boolean;
  rating: number | null;
  startedAt: string;
  endedAt: string | null;
  user: { name: string | null; email: string } | null;
}

interface AgentDetailClientProps {
  agent: Agent;
  conversations: Conversation[];
  knowledgeBases: KnowledgeBase[];
  avgDurationSeconds: number;
  orgId: string;
  orgSlug: string;
}

// ---------- Constants ----------

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "ACTIVE":
      return "secondary";
    case "ESCALATED":
      return "outline";
    case "ERRORED":
      return "destructive";
    default:
      return "secondary";
  }
}

// ---------- Component ----------

export function AgentDetailClient({
  agent,
  conversations,
  knowledgeBases,
  avgDurationSeconds,
  orgId,
  orgSlug,
}: AgentDetailClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Settings form state
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    agent.systemPrompt ?? ""
  );
  const [greetingMessage, setGreetingMessage] = useState(
    agent.greetingMessage ?? ""
  );
  const [language, setLanguage] = useState(agent.language);
  const [voiceId, setVoiceId] = useState(agent.voiceId ?? "");
  const [enablePiiGuardrails, setEnablePiiGuardrails] = useState(
    agent.enablePiiGuardrails
  );
  const [enableEscalation, setEnableEscalation] = useState(
    agent.enableEscalation
  );
  const [escalationMessage, setEscalationMessage] = useState(
    agent.escalationMessage ?? ""
  );
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(
    agent.maxSessionMinutes
  );
  const [isPublic, setIsPublic] = useState(agent.isPublic);
  const [isActive, setIsActive] = useState(agent.isActive);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(
    agent.kbLinks.map((link) => link.knowledgeBaseId)
  );

  function toggleKb(kbId: string) {
    setSelectedKbIds((prev) =>
      prev.includes(kbId)
        ? prev.filter((id) => id !== kbId)
        : [...prev, kbId]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Agent name is required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        systemPrompt: systemPrompt.trim() || null,
        greetingMessage: greetingMessage.trim() || null,
        language,
        voiceId: voiceId.trim() || null,
        enablePiiGuardrails,
        enableEscalation,
        escalationMessage: enableEscalation
          ? escalationMessage.trim() || null
          : null,
        maxSessionMinutes,
        isPublic,
        isActive,
        knowledgeBaseIds: selectedKbIds,
      };

      const res = await fetch(`/api/orgs/${orgId}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Failed to update agent (${res.status})`
        );
      }

      toast.success("Agent updated successfully.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/org/${orgSlug}/admin/agents`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {agent.name}
            </h1>
            <Badge variant={agent.isActive ? "default" : "secondary"}>
              {agent.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {agent.description && (
            <p className="mt-1 text-muted-foreground">
              {agent.description}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        {/* ===== Overview Tab ===== */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversations
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {agent._count.conversations}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Duration
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {avgDurationSeconds > 0
                    ? formatDuration(avgDurationSeconds)
                    : "--"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Knowledge Bases
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {agent.kbLinks.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Deployments
                </CardTitle>
                <Rocket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {agent._count.deployments}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Linked Knowledge Bases */}
          <Card>
            <CardHeader>
              <CardTitle>Linked Knowledge Bases</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.kbLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No knowledge bases linked to this agent.
                </p>
              ) : (
                <div className="space-y-2">
                  {agent.kbLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {link.knowledgeBase.name}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {link.knowledgeBase.type === "PUBLIC"
                          ? "Public"
                          : "Internal"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No conversations yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.slice(0, 5).map((convo) => (
                      <TableRow key={convo.id}>
                        <TableCell className="font-medium">
                          {convo.user?.name ||
                            convo.user?.email ||
                            "Anonymous"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(convo.status)}
                          >
                            {convo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{convo.messageCount}</TableCell>
                        <TableCell>
                          {convo.durationSeconds != null
                            ? formatDuration(convo.durationSeconds)
                            : "--"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(convo.startedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Settings Tab ===== */}
        <TabsContent value="settings" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this agent.
                  </p>
                </div>
                <Switch
                  id="edit-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-systemPrompt">System Prompt</Label>
                <Textarea
                  id="edit-systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-greetingMessage">
                  Greeting Message
                </Label>
                <Textarea
                  id="edit-greetingMessage"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger
                    id="edit-language"
                    className="w-full sm:w-64"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="edit-voiceId">Voice ID</Label>
                <Input
                  id="edit-voiceId"
                  placeholder="ElevenLabs voice ID"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter an ElevenLabs voice ID. Leave blank to use the
                  default voice.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-pii">PII Guardrails</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent the agent from sharing personally identifiable
                    information.
                  </p>
                </div>
                <Switch
                  id="edit-pii"
                  checked={enablePiiGuardrails}
                  onCheckedChange={setEnablePiiGuardrails}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-escalation">Escalation</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the agent to escalate conversations to a human.
                  </p>
                </div>
                <Switch
                  id="edit-escalation"
                  checked={enableEscalation}
                  onCheckedChange={setEnableEscalation}
                />
              </div>

              {enableEscalation && (
                <div className="space-y-2 pl-1">
                  <Label htmlFor="edit-escalationMsg">
                    Escalation Message
                  </Label>
                  <Textarea
                    id="edit-escalationMsg"
                    value={escalationMessage}
                    onChange={(e) => setEscalationMessage(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="edit-maxSession">
                  Max Session Duration (minutes)
                </Label>
                <Input
                  id="edit-maxSession"
                  type="number"
                  min={1}
                  max={120}
                  value={maxSessionMinutes}
                  onChange={(e) =>
                    setMaxSessionMinutes(
                      parseInt(e.target.value, 10) || 15
                    )
                  }
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Bases</CardTitle>
            </CardHeader>
            <CardContent>
              {knowledgeBases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No knowledge bases available.
                </p>
              ) : (
                <div className="space-y-3">
                  {knowledgeBases.map((kb) => (
                    <label
                      key={kb.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedKbIds.includes(kb.id)}
                        onCheckedChange={() => toggleKb(kb.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{kb.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kb.type === "PUBLIC" ? "Public" : "Internal"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-public">Public Access</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, anyone with the link can talk to this
                    agent without signing in.
                  </p>
                </div>
                <Switch
                  id="edit-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pb-8">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ===== Conversations Tab ===== */}
        <TabsContent value="conversations" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                All conversations for this agent (most recent first).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No conversations yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Escalated</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((convo) => (
                      <TableRow key={convo.id}>
                        <TableCell className="font-medium">
                          {convo.user?.name ||
                            convo.user?.email ||
                            "Anonymous"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(convo.status)}
                          >
                            {convo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{convo.messageCount}</TableCell>
                        <TableCell>
                          {convo.durationSeconds != null
                            ? formatDuration(convo.durationSeconds)
                            : "--"}
                        </TableCell>
                        <TableCell>
                          {convo.wasEscalated ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <span className="text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {convo.rating != null ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span>{convo.rating}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(convo.startedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

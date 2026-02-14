"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Globe,
  Smartphone,
  Code,
  LayoutGrid,
  Copy,
  Check,
  Loader2,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- Types ----------

interface Agent {
  id: string;
  name: string;
}

interface Deployment {
  id: string;
  name: string;
  type: "WEB_WIDGET" | "STANDALONE" | "PWA" | "API";
  isActive: boolean;
  embedToken: string;
  requireAuth: boolean;
  allowedOrigins: string[];
  createdAt: string;
  agent: { id: string; name: string };
  _count: { conversations: number };
}

interface DeploymentsClientProps {
  deployments: Deployment[];
  agents: Agent[];
  orgId: string;
  orgSlug: string;
}

// ---------- Helpers ----------

const DEPLOYMENT_TYPES = [
  { value: "WEB_WIDGET", label: "Web Widget" },
  { value: "STANDALONE", label: "Standalone" },
  { value: "PWA", label: "PWA" },
  { value: "API", label: "API" },
] as const;

function typeIcon(type: string) {
  switch (type) {
    case "WEB_WIDGET":
      return <Globe className="h-4 w-4" />;
    case "STANDALONE":
      return <LayoutGrid className="h-4 w-4" />;
    case "PWA":
      return <Smartphone className="h-4 w-4" />;
    case "API":
      return <Code className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

function typeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "WEB_WIDGET":
      return "default";
    case "STANDALONE":
      return "secondary";
    case "PWA":
      return "outline";
    case "API":
      return "secondary";
    default:
      return "outline";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- Copy Button ----------

function CopyTokenButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Embed token copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy token.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
        {token.length > 16 ? `${token.slice(0, 16)}...` : token}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">Copy token</span>
      </Button>
    </div>
  );
}

// ---------- Component ----------

export function DeploymentsClient({
  deployments: initialDeployments,
  agents,
  orgId,
}: DeploymentsClientProps) {
  const router = useRouter();
  const [deployments, setDeployments] = useState(initialDeployments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newAgentId, setNewAgentId] = useState("");
  const [newType, setNewType] = useState<string>("WEB_WIDGET");
  const [newRequireAuth, setNewRequireAuth] = useState(true);
  const [newAllowedOrigins, setNewAllowedOrigins] = useState("");

  function resetForm() {
    setNewName("");
    setNewAgentId("");
    setNewType("WEB_WIDGET");
    setNewRequireAuth(true);
    setNewAllowedOrigins("");
  }

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Deployment name is required.");
      return;
    }
    if (!newAgentId) {
      toast.error("Please select an agent.");
      return;
    }

    setIsCreating(true);

    try {
      const originsArray = newAllowedOrigins
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: newName.trim(),
        agentId: newAgentId,
        type: newType,
        requireAuth: newRequireAuth,
        allowedOrigins: originsArray,
      };

      const res = await fetch(`/api/orgs/${orgId}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Failed to create deployment (${res.status})`
        );
      }

      toast.success("Deployment created successfully.");
      resetForm();
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(deploymentId: string, newActive: boolean) {
    // Optimistic update
    setDeployments((ds) =>
      ds.map((d) =>
        d.id === deploymentId ? { ...d, isActive: newActive } : d
      )
    );

    try {
      const res = await fetch(`/api/orgs/${orgId}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // This endpoint may not support PATCH directly, so we use a simpler approach
          // In a real implementation, you'd have a dedicated PATCH endpoint
          id: deploymentId,
          isActive: newActive,
        }),
      });

      // If the API doesn't support this, just show the toast
      if (!res.ok) {
        // Revert
        setDeployments((ds) =>
          ds.map((d) =>
            d.id === deploymentId ? { ...d, isActive: !newActive } : d
          )
        );
        toast.error("Failed to update deployment status.");
        return;
      }

      toast.success(
        newActive ? "Deployment activated." : "Deployment deactivated."
      );
      router.refresh();
    } catch {
      // Revert
      setDeployments((ds) =>
        ds.map((d) =>
          d.id === deploymentId ? { ...d, isActive: !newActive } : d
        )
      );
      toast.error("Failed to update deployment status.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Deployments
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage how your agents are deployed and accessed.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Deployment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Deployment</DialogTitle>
              <DialogDescription>
                Deploy an agent as a web widget, standalone page, PWA, or
                API endpoint.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deploy-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deploy-name"
                  placeholder="e.g. Website Widget"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deploy-agent">
                  Agent <span className="text-destructive">*</span>
                </Label>
                <Select value={newAgentId} onValueChange={setNewAgentId}>
                  <SelectTrigger id="deploy-agent">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No active agents available
                      </SelectItem>
                    ) : (
                      agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deploy-type">Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger id="deploy-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPLOYMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deploy-auth">
                    Require Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Users must sign in before using this deployment.
                  </p>
                </div>
                <Switch
                  id="deploy-auth"
                  checked={newRequireAuth}
                  onCheckedChange={setNewRequireAuth}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deploy-origins">Allowed Origins</Label>
                <Textarea
                  id="deploy-origins"
                  placeholder="https://example.com, https://app.example.com"
                  value={newAllowedOrigins}
                  onChange={(e) => setNewAllowedOrigins(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of allowed origin URLs for CORS.
                  Leave blank to allow all origins.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deployments Table */}
      {deployments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <Rocket className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">
            No deployments yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first deployment to make an agent accessible.
          </p>
          <Button
            className="mt-6"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Deployment
          </Button>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Embed Token</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell className="font-medium">
                    {deployment.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={typeBadgeVariant(deployment.type)}
                      className="gap-1.5"
                    >
                      {typeIcon(deployment.type)}
                      {deployment.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deployment.agent.name}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={deployment.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleActive(deployment.id, checked)
                      }
                      size="sm"
                    />
                  </TableCell>
                  <TableCell>{deployment._count.conversations}</TableCell>
                  <TableCell>
                    <CopyTokenButton token={deployment.embedToken} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(deployment.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

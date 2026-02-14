"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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

interface KnowledgeBase {
  id: string;
  name: string;
  type: string;
}

interface CreateAgentFormProps {
  orgId: string;
  orgSlug: string;
  knowledgeBases: KnowledgeBase[];
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
];

export function CreateAgentForm({
  orgId,
  orgSlug,
  knowledgeBases,
}: CreateAgentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [language, setLanguage] = useState("en");
  const [voiceId, setVoiceId] = useState("");
  const [enablePiiGuardrails, setEnablePiiGuardrails] = useState(true);
  const [enableEscalation, setEnableEscalation] = useState(true);
  const [escalationMessage, setEscalationMessage] = useState("");
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(15);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);

  function toggleKb(kbId: string) {
    setSelectedKbIds((prev) =>
      prev.includes(kbId)
        ? prev.filter((id) => id !== kbId)
        : [...prev, kbId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Agent name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        greetingMessage: greetingMessage.trim() || undefined,
        language,
        voiceId: voiceId.trim() || undefined,
        enablePiiGuardrails,
        enableEscalation,
        escalationMessage: enableEscalation
          ? escalationMessage.trim() || undefined
          : undefined,
        maxSessionMinutes,
        isPublic,
        knowledgeBaseIds:
          selectedKbIds.length > 0 ? selectedKbIds : undefined,
      };

      const res = await fetch(`/api/orgs/${orgId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Failed to create agent (${res.status})`
        );
      }

      toast.success("Agent created successfully.");
      router.push(`/org/${orgSlug}/admin/agents`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/org/${orgSlug}/admin/agents`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Agent</h1>
          <p className="mt-1 text-muted-foreground">
            Configure a new AI voice agent for your organization.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Give your agent a name and description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. HR Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe what this agent does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              Define how your agent communicates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                placeholder={`You are a helpful HR assistant for Acme Corp. Answer employee questions about company policies, benefits, and procedures based only on the provided knowledge base. If you don't know the answer, suggest contacting the HR team directly.`}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greetingMessage">Greeting Message</Label>
              <Textarea
                id="greetingMessage"
                placeholder="Hello! I'm your company assistant. How can I help you today?"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" className="w-full sm:w-64">
                  <SelectValue placeholder="Select language" />
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

        {/* Voice */}
        <Card>
          <CardHeader>
            <CardTitle>Voice</CardTitle>
            <CardDescription>
              Configure the ElevenLabs voice for this agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="voiceId">Voice ID</Label>
              <Input
                id="voiceId"
                placeholder="ElevenLabs voice ID (e.g. 21m00Tcm4TlvDq8ikWAM)"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter an ElevenLabs voice ID. Leave blank to use the default
                voice.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader>
            <CardTitle>Behavior</CardTitle>
            <CardDescription>
              Safety and session configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="piiGuardrails">PII Guardrails</Label>
                <p className="text-sm text-muted-foreground">
                  Prevent the agent from sharing personally identifiable
                  information.
                </p>
              </div>
              <Switch
                id="piiGuardrails"
                checked={enablePiiGuardrails}
                onCheckedChange={setEnablePiiGuardrails}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="escalation">Escalation</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the agent to escalate conversations to a human.
                </p>
              </div>
              <Switch
                id="escalation"
                checked={enableEscalation}
                onCheckedChange={setEnableEscalation}
              />
            </div>

            {enableEscalation && (
              <div className="space-y-2 pl-1">
                <Label htmlFor="escalationMessage">
                  Escalation Message
                </Label>
                <Textarea
                  id="escalationMessage"
                  placeholder="I'll connect you with a team member who can help further."
                  value={escalationMessage}
                  onChange={(e) => setEscalationMessage(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="maxSessionMinutes">
                Max Session Duration (minutes)
              </Label>
              <Input
                id="maxSessionMinutes"
                type="number"
                min={1}
                max={120}
                value={maxSessionMinutes}
                onChange={(e) =>
                  setMaxSessionMinutes(parseInt(e.target.value, 10) || 15)
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Maximum duration for a single conversation session.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Bases */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Bases</CardTitle>
            <CardDescription>
              Select the knowledge bases this agent can access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {knowledgeBases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No knowledge bases available.{" "}
                <Link
                  href={`/org/${orgSlug}/admin/knowledge-bases`}
                  className="text-primary underline underline-offset-4"
                >
                  Create one first
                </Link>
                .
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

        {/* Access */}
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
            <CardDescription>
              Control who can interact with this agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Access</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, anyone with the link can talk to this agent
                  without signing in. When disabled, only authenticated
                  organization members can use it.
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href={`/org/${orgSlug}/admin/agents`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Agent
          </Button>
        </div>
      </form>
    </div>
  );
}

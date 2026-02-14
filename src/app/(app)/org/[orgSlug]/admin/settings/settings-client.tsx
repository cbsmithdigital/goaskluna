"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────

interface SettingsClientProps {
  orgId: string;
  initialName: string;
  slug: string;
  initialBillingEmail: string;
}

// ─── Component ────────────────────────────────────────────────

export function SettingsClient({
  orgId,
  initialName,
  slug,
  initialBillingEmail,
}: SettingsClientProps) {
  const [name, setName] = useState(initialName);
  const [billingEmail, setBillingEmail] = useState(initialBillingEmail);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    name !== initialName || billingEmail !== initialBillingEmail;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          billingEmail: billingEmail.trim() || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save settings");
      }

      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your organization&apos;s configuration
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Basic organization information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={slug}
              disabled
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              The URL-friendly identifier for your organization. This cannot be
              changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-email">Billing Email</Label>
            <Input
              id="billing-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="billing@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Invoices and billing notifications will be sent to this address.
            </p>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <CardTitle className="text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
          </div>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-900/50">
            <div>
              <p className="font-medium">Delete Organization</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this organization, all its agents, knowledge
                bases, conversations, and associated data. This action cannot be
                undone.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Delete
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-red-200 p-4 dark:border-red-900/50">
            <div>
              <p className="font-medium">Transfer Ownership</p>
              <p className="text-sm text-muted-foreground">
                Transfer this organization to another user. You will lose admin
                access.
              </p>
            </div>
            <Button variant="destructive" size="sm" disabled>
              Transfer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

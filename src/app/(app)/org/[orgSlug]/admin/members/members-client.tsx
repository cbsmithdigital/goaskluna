"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, Shield, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------- Types ----------

interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Membership {
  id: string;
  userId: string;
  orgId: string;
  role: "ORG_ADMIN" | "MANAGER" | "EMPLOYEE";
  department: string | null;
  createdAt: string;
  user: MemberUser;
}

interface MembersClientProps {
  memberships: Membership[];
  orgId: string;
  orgSlug: string;
}

// ---------- Helpers ----------

const ROLES = ["ORG_ADMIN", "MANAGER", "EMPLOYEE"] as const;

function roleBadgeVariant(
  role: string
): "default" | "secondary" | "outline" {
  switch (role) {
    case "ORG_ADMIN":
      return "default";
    case "MANAGER":
      return "secondary";
    default:
      return "outline";
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case "ORG_ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "EMPLOYEE":
      return "Employee";
    default:
      return role;
  }
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- Component ----------

export function MembersClient({
  memberships: initialMemberships,
  orgId,
}: MembersClientProps) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] =
    useState<Membership | null>(null);

  async function handleRoleChange(
    memberId: string,
    newRole: (typeof ROLES)[number]
  ) {
    const prev = memberships.find((m) => m.id === memberId);
    if (!prev || prev.role === newRole) return;

    // Optimistic update
    setMemberships((ms) =>
      ms.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );

    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        throw new Error("Failed to update role");
      }

      toast.success(
        `Role updated to ${roleLabel(newRole)} for ${prev.user.name || prev.user.email}.`
      );
      router.refresh();
    } catch {
      // Revert optimistic update
      setMemberships((ms) =>
        ms.map((m) =>
          m.id === memberId ? { ...m, role: prev.role } : m
        )
      );
      toast.error("Failed to update member role.");
    }
  }

  async function handleRemoveMember(member: Membership) {
    setRemovingId(member.id);

    try {
      const res = await fetch(`/api/orgs/${orgId}/members/${member.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove member");
      }

      setMemberships((ms) => ms.filter((m) => m.id !== member.id));
      toast.success(
        `${member.user.name || member.user.email} has been removed.`
      );
      setConfirmRemoveMember(null);
      router.refresh();
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-muted-foreground">
            {memberships.length}{" "}
            {memberships.length === 1 ? "member" : "members"} in your
            organization
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="text-lg font-semibold">
            {memberships.length}
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((member) => (
              <TableRow key={member.id}>
                {/* Avatar + Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {member.user.avatarUrl && (
                        <AvatarImage
                          src={member.user.avatarUrl}
                          alt={member.user.name ?? member.user.email}
                        />
                      )}
                      <AvatarFallback className="text-xs">
                        {getInitials(
                          member.user.name,
                          member.user.email
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {member.user.name || "--"}
                    </span>
                  </div>
                </TableCell>

                {/* Email */}
                <TableCell className="text-muted-foreground">
                  {member.user.email}
                </TableCell>

                {/* Role Badge */}
                <TableCell>
                  <Badge variant={roleBadgeVariant(member.role)}>
                    {roleLabel(member.role)}
                  </Badge>
                </TableCell>

                {/* Department */}
                <TableCell className="text-muted-foreground">
                  {member.department || "--"}
                </TableCell>

                {/* Joined */}
                <TableCell className="text-muted-foreground">
                  {formatDate(member.createdAt)}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Member actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          disabled={member.role === role}
                          onClick={() =>
                            handleRoleChange(member.id, role)
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Set as {roleLabel(role)}
                          {member.role === role && " (current)"}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmRemoveMember(member)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={confirmRemoveMember !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                {confirmRemoveMember?.user.name ||
                  confirmRemoveMember?.user.email}
              </span>{" "}
              from this organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveMember(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removingId === confirmRemoveMember?.id}
              onClick={() => {
                if (confirmRemoveMember) {
                  handleRemoveMember(confirmRemoveMember);
                }
              }}
            >
              {removingId === confirmRemoveMember?.id
                ? "Removing..."
                : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

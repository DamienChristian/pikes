"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";
import { EventMember } from "@/app/types";
import { UserPlus, Trash2, Shield, Edit3, Eye, Users } from "lucide-react";
import { useAppDispatch } from "@/app/lib/store/hooks";
import { fetchEvents } from "@/app/lib/store/eventsSlice";

interface CalendarMemberInfo {
  userId: string;
  role: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

interface ShareEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    calendarId?: string;
  } | null;
}

export function ShareEventDialog({
  open,
  onOpenChange,
  event,
}: ShareEventDialogProps) {
  const dispatch = useAppDispatch();
  const [members, setMembers] = useState<EventMember[]>([]);
  const [calendarMembers, setCalendarMembers] = useState<CalendarMemberInfo[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addRole, setAddRole] = useState<"viewer" | "editor">("viewer");
  const [isAdding, setIsAdding] = useState(false);
  const [addingCalMemberId, setAddingCalMemberId] = useState<string | null>(
    null
  );

  const fetchMembers = useCallback(async () => {
    if (!event) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/share`);
      const data = await res.json();
      if (data.success) {
        setMembers(data.data.members || []);
        setCalendarMembers(data.data.calendarMembers || []);
      }
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [event]);

  useEffect(() => {
    if (open && event) {
      fetchMembers();
      setAddInput("");
      setAddRole("viewer");
    }
  }, [open, event, fetchMembers]);

  const handleAddMember = async () => {
    if (!event || !addInput.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: addInput.trim(),
          role: addRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      toast.success(data.message || "Member added");
      setAddInput("");
      fetchMembers();
      dispatch(fetchEvents());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add member"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddCalendarMember = async (calMember: CalendarMemberInfo) => {
    if (!event) return;
    const identifier = calMember.username || calMember.email;
    if (!identifier) return;

    setAddingCalMemberId(calMember.userId);
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: identifier,
          role: "viewer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      toast.success(data.message || "Member added");
      fetchMembers();
      dispatch(fetchEvents());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add member"
      );
    } finally {
      setAddingCalMemberId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!event) return;
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");
      toast.success("Member removed");
      fetchMembers();
      dispatch(fetchEvents());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

  const handleChangeRole = async (
    userId: string,
    newRole: "viewer" | "editor"
  ) => {
    if (!event) return;
    try {
      const res = await fetch(`/api/events/${event.id}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to update member role");
      toast.success("Role updated");
      fetchMembers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
    }
  };

  if (!event) return null;

  const displayName = (m: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    userId: string;
  }) => {
    if (m.firstName || m.lastName) {
      return `${m.firstName || ""} ${m.lastName || ""}`.trim();
    }
    return m.username || m.email || m.userId;
  };

  // Calendar members who are NOT already event members
  const eventMemberIds = new Set(members.map((m) => m.userId));
  const availableCalendarMembers = calendarMembers.filter(
    (cm) => !eventMemberIds.has(cm.userId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Share &quot;{event.title}&quot;
          </DialogTitle>
        </DialogHeader>

        {/* Add member by username/email */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Add people</label>
          <div className="flex gap-2">
            <Input
              placeholder="Username or email"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMember();
                }
              }}
              className="flex-1"
            />
            <Select
              value={addRole}
              onValueChange={(v) => setAddRole(v as "viewer" | "editor")}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMember}
              disabled={isAdding || !addInput.trim()}
              size="icon"
            >
              {isAdding ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Calendar members (quick add) */}
        {availableCalendarMembers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              People in this calendar
            </label>
            <div className="divide-y rounded-lg border max-h-40 overflow-y-auto">
              {availableCalendarMembers.map((cm) => (
                <div
                  key={cm.userId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {(
                      cm.firstName?.[0] ||
                      cm.username?.[0] ||
                      "?"
                    ).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayName(cm)}
                    </p>
                    {cm.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{cm.username}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {cm.role}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={addingCalMemberId === cm.userId}
                    onClick={() => handleAddCalendarMember(cm)}
                  >
                    {addingCalMemberId === cm.userId ? (
                      <LoadingSpinner className="h-3 w-3" />
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event member list */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Event members ({members.length})
          </label>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner className="h-5 w-5" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No members yet. Add people above.
            </p>
          ) : (
            <div className="divide-y rounded-lg border max-h-60 overflow-y-auto">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {(m.firstName?.[0] || m.username?.[0] || "?").toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayName(m)}
                    </p>
                    {m.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{m.username}
                      </p>
                    )}
                  </div>

                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      handleChangeRole(m.userId, v as "viewer" | "editor")
                    }
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-3 w-3" />
                          Viewer
                        </span>
                      </SelectItem>
                      <SelectItem value="editor">
                        <span className="flex items-center gap-1.5">
                          <Edit3 className="h-3 w-3" />
                          Editor
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveMember(m.userId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

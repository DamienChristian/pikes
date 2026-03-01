"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Edit,
  Trash2,
  FileText,
  Share2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { UserCalendar } from "@/app/types";
import { useAppSelector } from "@/app/lib/store/hooks";
import { ShareEventDialog } from "./ShareEventDialog";

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    description?: string;
    startDate: string | Date;
    endDate: string | Date;
    allDay: boolean;
    color?: string;
    location?: string;
    calendarId?: string;
    userId?: string;
  } | null;
  calendars?: UserCalendar[];
  /** @deprecated calendars prop is ignored — reads from Redux store */
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EventDetailDialog({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
}: EventDetailDialogProps) {
  const calendars = useAppSelector((state) => state.calendars.items);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [notes, setNotes] = useState<
    Array<{ id: string; title: string; content: string; category?: string }>
  >([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const fetchNotes = async () => {
    if (!event) return;

    setIsLoadingNotes(true);
    try {
      const response = await fetch(
        `/api/notes?linkedEventId=${event.id}&limit=100`
      );
      const data = await response.json();
      if (data.success) {
        setNotes(data.data.notes);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (open && event) {
      fetchNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const getTextPreview = (html: string, maxLength: number = 100) => {
    const text = html.replace(/<[^>]*>/g, "");
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (!event) return null;

  // Derive the current user's ID from their owned calendars
  const ownedCalendar = calendars.find((c) => c.role === "owner");
  const currentUserId = ownedCalendar?.userId;

  // Determine if the user can edit/delete this event
  // Priority: event owner > calendar owner/editor > event-level editor
  const eventCalendar = event.calendarId
    ? calendars.find((c) => c.id === event.calendarId)
    : undefined;

  const isEventOwner = !!(currentUserId && event.userId === currentUserId);
  const hasCalendarEditAccess =
    eventCalendar?.role === "owner" || eventCalendar?.role === "editor";

  const canEdit = isEventOwner || hasCalendarEditAccess || false;

  const startDate =
    typeof event.startDate === "string"
      ? parseISO(event.startDate)
      : event.startDate;
  const endDate =
    typeof event.endDate === "string" ? parseISO(event.endDate) : event.endDate;

  const formatEventDate = () => {
    if (event.allDay) {
      if (format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
        return format(startDate, "EEEE, MMMM d, yyyy");
      }
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    }

    if (format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
      return `${format(startDate, "EEEE, MMMM d, yyyy • h:mm a")} - ${format(
        endDate,
        "h:mm a"
      )}`;
    }

    return `${format(startDate, "MMM d, h:mm a")} - ${format(
      endDate,
      "MMM d, h:mm a"
    )}`;
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success("Event deleted successfully!");
      onOpenChange(false);
      onDelete?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div
                className="w-1 h-16 rounded-full mt-1"
                style={{ backgroundColor: event.color || "#3B82F6" }}
              />
              <DialogTitle className="text-xl">{event.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Date & Time</p>
              <p className="text-sm text-muted-foreground">
                {formatEventDate()}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {event.location}
                </p>
              </div>
            </div>
          )}

          {/* Calendar */}
          {event.calendarId &&
            (() => {
              const cal = calendars.find((c) => c.id === event.calendarId);
              if (!cal) return null;
              return (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Calendar</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cal.color }}
                      />
                      <p className="text-sm text-muted-foreground">
                        {cal.name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {notes.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">Notes ({notes.length})</p>
              </div>

              {isLoadingNotes ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getTextPreview(note.content)}
                        </p>
                        {note.category && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                            {note.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          {canEdit ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canEdit && (
              <Button onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Share Event Dialog */}
      <ShareEventDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        event={
          event
            ? {
                id: event.id,
                title: event.title,
                calendarId: event.calendarId,
              }
            : null
        }
      />
    </Dialog>
  );
}

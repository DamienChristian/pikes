"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  MapPin,
  Calendar,
  CheckSquare,
  Plus,
  Check,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { NoteDialog } from "@/app/components/notes/NoteDialog";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
import { DateTimePicker } from "@/app/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Checkbox } from "@/app/components/ui/checkbox";
import { toast } from "sonner";
import { UserCalendar } from "@/app/types";
import { CalendarDialog } from "@/app/components/calendar/CalendarDialog";
import { useAppSelector } from "@/app/lib/store/hooks";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  event?: {
    id: string;
    title: string;
    description?: string;
    startDate: string | Date;
    endDate: string | Date;
    allDay: boolean;
    color?: string;
    location?: string;
    type?: "event" | "task";
    completed?: boolean;
    deadline?: string | Date;
    category?: string;
    priority?: "low" | "medium" | "high";
    calendarId?: string;
    isRecurring?: boolean;
    recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
    recurrenceInterval?: number;
    recurrenceDaysOfWeek?: number[];
    recurrenceEndDate?: string | Date;
    recurrenceCount?: number;
  };
  calendars?: UserCalendar[];
  /** @deprecated calendars prop is ignored — reads from Redux store */
  onSuccess?: () => void;
}

const PRESET_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Pink", value: "#EC4899" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Teal", value: "#14B8A6" },
];

type EventFormData = {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color?: string;
  location?: string;
  type: "event" | "task";
  completed?: boolean;
  deadline?: Date;
  category?: string;
  priority?: "low" | "medium" | "high";
  calendarId?: string;
  isRecurring?: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  recurrenceInterval?: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceEndDate?: Date;
  recurrenceCount?: number;
};

export function EventDialog({
  open,
  onOpenChange,
  defaultDate,
  event,
  onSuccess,
}: EventDialogProps) {
  const calendars = useAppSelector((state) => state.calendars.items);
  // Only calendars the user can create events on (owner or editor)
  const writableCalendars = calendars.filter(
    (c) => c.role === "owner" || c.role === "editor"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [existingNotes, setExistingNotes] = useState<
    Array<{
      id: string;
      title: string;
      content: string;
      category?: string;
      linkedEventId?: string;
    }>
  >([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const isEditing = !!(event && event.id);
  const lastChangedField = useRef<"startDate" | "endDate" | "deadline" | null>(
    null
  );

  const defaultStartDate = useMemo(() => {
    if (event?.startDate) {
      return typeof event.startDate === "string"
        ? new Date(event.startDate)
        : event.startDate;
    }
    if (defaultDate) {
      const date = new Date(defaultDate);
      date.setHours(9, 0, 0, 0);
      return date;
    }
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    return now;
  }, [event?.startDate, defaultDate]);

  const defaultEndDate = useMemo(() => {
    if (event?.endDate) {
      const endDate =
        typeof event.endDate === "string"
          ? new Date(event.endDate)
          : event.endDate;
      // If creating new event with preset end time, use it
      if (!event.id) return endDate;
      return endDate;
    }
    const end = new Date(defaultStartDate);
    end.setHours(defaultStartDate.getHours() + 1);
    return end;
  }, [event?.endDate, event?.id, defaultStartDate]);

  const form = useForm<EventFormData>({
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      allDay: event?.allDay || false,
      color: event?.color || "#3B82F6",
      location: event?.location || "",
      type: "event",
      completed: false,
      deadline: defaultEndDate,
      category: "",
      calendarId:
        event?.calendarId || calendars?.find((c) => c.isDefault)?.id || "",
    },
  });

  const eventType = form.watch("type");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const deadline = form.watch("deadline");

  // Single useEffect to handle all date validation
  useEffect(() => {
    if (eventType === "event" && startDate && endDate) {
      // If start date is after end date and start was changed last
      if (startDate > endDate && lastChangedField.current === "startDate") {
        const newEndDate = new Date(startDate);
        newEndDate.setHours(startDate.getHours() + 1);
        form.setValue("endDate", newEndDate, { shouldValidate: false });
        lastChangedField.current = null;
      }
      // If end date is before start date and end was changed last
      else if (endDate < startDate && lastChangedField.current === "endDate") {
        const newStartDate = new Date(endDate);
        newStartDate.setHours(endDate.getHours() - 1);
        form.setValue("startDate", newStartDate, { shouldValidate: false });
        lastChangedField.current = null;
      }
    }

    // Handle task deadline validation
    if (eventType === "task" && startDate && deadline) {
      if (startDate > deadline && lastChangedField.current === "startDate") {
        const newDeadline = new Date(startDate);
        newDeadline.setDate(startDate.getDate() + 1);
        form.setValue("deadline", newDeadline, { shouldValidate: false });
        lastChangedField.current = null;
      }
    }
  }, [startDate, endDate, deadline, eventType, form]);

  // Fetch categories
  useEffect(() => {
    if (open) {
      fetch("/api/categories")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCategories(data.data.categories || []);
          }
        })
        .catch((error) => {
          console.error("Error fetching categories:", error);
        });
    }
  }, [open]);

  // Fetch existing notes
  useEffect(() => {
    if (open) {
      const url = isEditing ? `/api/notes?limit=100` : `/api/notes?limit=100`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            if (isEditing && event) {
              // When editing, show all notes and pre-select linked ones
              const linkedNotes = data.data.notes.filter(
                (note: { linkedEventId?: string }) =>
                  note.linkedEventId === event.id
              );
              const unlinkedNotes = data.data.notes.filter(
                (note: { linkedEventId?: string }) => !note.linkedEventId
              );
              setExistingNotes([...linkedNotes, ...unlinkedNotes]);
              setSelectedNoteIds(linkedNotes.map((n: { id: string }) => n.id));
            } else {
              // When creating, only show unlinked notes
              const unlinkedNotes = data.data.notes.filter(
                (note: { linkedEventId?: string }) => !note.linkedEventId
              );
              setExistingNotes(unlinkedNotes);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching notes:", error);
        });
    }
  }, [open, isEditing, event]);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      const eventDeadline = event?.deadline
        ? new Date(event.deadline)
        : defaultEndDate;

      form.reset({
        title: event?.title || "",
        description: event?.description || "",
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        allDay: event?.allDay || false,
        color: event?.color || "#3B82F6",
        location: event?.location || "",
        type: event?.type || "event",
        completed: event?.completed || false,
        deadline: eventDeadline,
        category: event?.category || "",
        priority: event?.priority || "medium",
        calendarId:
          event?.calendarId || calendars?.find((c) => c.isDefault)?.id || "",
        isRecurring: event?.isRecurring || false,
        recurrencePattern: event?.recurrencePattern || "daily",
        recurrenceInterval: event?.recurrenceInterval || 1,
        recurrenceDaysOfWeek: event?.recurrenceDaysOfWeek || [],
        recurrenceEndDate: event?.recurrenceEndDate
          ? new Date(event.recurrenceEndDate)
          : undefined,
        recurrenceCount: event?.recurrenceCount,
      });
      setShowCategoryInput(false);
      setNewCategory("");
      setSelectedNoteIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event, defaultStartDate, defaultEndDate, form]);

  async function onSubmit(data: EventFormData) {
    setIsSubmitting(true);

    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      form.setError("title", { message: "Title is required" });
      setIsSubmitting(false);
      return;
    }

    if (data.title.length > 100) {
      form.setError("title", {
        message: "Title must be less than 100 characters",
      });
      setIsSubmitting(false);
      return;
    }

    if (data.endDate < data.startDate) {
      form.setError("endDate", {
        message: "End date must be after or equal to start date",
      });
      setIsSubmitting(false);
      return;
    }

    // For tasks, if deadline is set, validate it
    if (
      data.type === "task" &&
      data.deadline &&
      data.deadline < data.startDate
    ) {
      form.setError("deadline", {
        message: "Deadline must be after or equal to start date",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const url = isEditing ? `/api/events/${event.id}` : "/api/events";
      const method = isEditing ? "PATCH" : "POST";

      // Build request payload based on type
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description || "",
        type: data.type,
        color: data.color,
        location: data.location || "",
      };

      if (data.calendarId) {
        payload.calendarId = data.calendarId;
      }

      if (data.category) {
        payload.category = data.category;
      }

      if (data.type === "event") {
        payload.startDate = new Date(data.startDate).toISOString();
        payload.endDate = new Date(data.endDate).toISOString();
        payload.allDay = data.allDay;

        // Add recurrence fields for events
        if (data.isRecurring) {
          payload.isRecurring = true;
          payload.recurrencePattern = data.recurrencePattern;
          payload.recurrenceInterval = data.recurrenceInterval || 1;

          if (
            data.recurrencePattern === "weekly" &&
            data.recurrenceDaysOfWeek
          ) {
            payload.recurrenceDaysOfWeek = data.recurrenceDaysOfWeek;
          }

          if (data.recurrenceEndDate) {
            payload.recurrenceEndDate = new Date(
              data.recurrenceEndDate
            ).toISOString();
          }

          if (data.recurrenceCount) {
            payload.recurrenceCount = data.recurrenceCount;
          }
        }
      } else {
        // For tasks
        payload.startDate = new Date(data.startDate).toISOString();
        payload.endDate = new Date(data.startDate).toISOString(); // Same as start
        if (data.deadline) {
          payload.deadline = new Date(data.deadline).toISOString();
        }
        payload.completed = data.completed || false;
        payload.priority = data.priority || "medium";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Failed to ${isEditing ? "update" : "create"} ${data.type}`
        );
      }

      // Handle note linking for both create and update
      const eventId = result.data.event.id;

      if (isEditing) {
        // For editing: get previously linked notes
        const previouslyLinkedResponse = await fetch(
          `/api/notes?linkedEventId=${eventId}&limit=100`
        );
        const previouslyLinkedData = await previouslyLinkedResponse.json();
        const previouslyLinkedIds = previouslyLinkedData.success
          ? previouslyLinkedData.data.notes.map((n: { id: string }) => n.id)
          : [];

        // Unlink notes that were removed
        const notesToUnlink = previouslyLinkedIds.filter(
          (id: string) => !selectedNoteIds.includes(id)
        );
        await Promise.all(
          notesToUnlink.map((noteId: string) =>
            fetch(`/api/notes/${noteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ linkedEventId: null }),
            })
          )
        );

        // Link newly selected notes
        const notesToLink = selectedNoteIds.filter(
          (id) => !previouslyLinkedIds.includes(id)
        );
        await Promise.all(
          notesToLink.map((noteId) =>
            fetch(`/api/notes/${noteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ linkedEventId: eventId }),
            })
          )
        );
      } else {
        // For new events: just link selected notes
        if (selectedNoteIds.length > 0) {
          await Promise.all(
            selectedNoteIds.map((noteId) =>
              fetch(`/api/notes/${noteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ linkedEventId: eventId }),
              })
            )
          );
        }
      }

      toast.success(
        isEditing
          ? `${data.type === "task" ? "Task" : "Event"} updated successfully!`
          : `${data.type === "task" ? "Task" : "Event"} created successfully!`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "create"} ${data.type || "event"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit ${eventType === "task" ? "Task" : "Event"}`
              : `Create New ${eventType === "task" ? "Task" : "Event"}`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Type Toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          field.value === "event" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => field.onChange("event")}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Event
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "task" ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange("task")}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Task
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calendar Picker */}
            {writableCalendars && writableCalendars.length > 0 && (
              <FormField
                control={form.control}
                name="calendarId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {writableCalendars.map((cal) => (
                          <Button
                            key={cal.id}
                            type="button"
                            variant={
                              field.value === cal.id ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => field.onChange(cal.id)}
                            disabled={isSubmitting}
                            className="gap-2"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cal.color }}
                            />
                            {cal.name}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCalendarDialogOpen(true)}
                          disabled={isSubmitting}
                          className="gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          New
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        eventType === "task" ? "Task title" : "Event title"
                      }
                      {...field}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time - Show different fields for tasks vs events */}
            {eventType === "event" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start *</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={(date) => {
                            lastChangedField.current = "startDate";
                            field.onChange(date);
                          }}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End *</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={(date) => {
                            lastChangedField.current = "endDate";
                            field.onChange(date);
                          }}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value || new Date()}
                        onChange={(date) => {
                          lastChangedField.current = "deadline";
                          field.onChange(date);
                        }}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* All Day - Only for events */}
            {eventType === "event" && (
              <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      All day event
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            {/* Completed - Only for tasks */}
            {eventType === "task" && (
              <FormField
                control={form.control}
                name="completed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Mark as completed
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            {/* Priority - Only for tasks */}
            {eventType === "task" && (
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            field.value === "high" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => field.onChange("high")}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                          High
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "medium" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => field.onChange("medium")}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                          Medium
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "low" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => field.onChange("low")}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                          Low
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Category - For both events and tasks */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!showCategoryInput && (
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => (
                            <Button
                              key={cat}
                              type="button"
                              variant={
                                field.value === cat ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => field.onChange(cat)}
                              disabled={isSubmitting}
                            >
                              {field.value === cat && (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              {cat}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCategoryInput(true)}
                            disabled={isSubmitting}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            New Category
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => field.onChange("")}
                              disabled={isSubmitting}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      )}
                      {showCategoryInput && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter new category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            disabled={isSubmitting}
                            maxLength={50}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (newCategory.trim()) {
                                field.onChange(newCategory.trim());
                                setCategories((prev) => [
                                  ...new Set([...prev, newCategory.trim()]),
                                ]);
                                setShowCategoryInput(false);
                                setNewCategory("");
                              }
                            }}
                            disabled={isSubmitting || !newCategory.trim()}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowCategoryInput(false);
                              setNewCategory("");
                            }}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Add location"
                        className="pl-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Add description..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          style={{
                            backgroundColor: color.value,
                            borderColor:
                              field.value === color.value
                                ? "currentColor"
                                : "transparent",
                          }}
                          aria-label={`Select ${color.name} color`}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence - Only for events */}
            {eventType === "event" && (
              <>
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Recurring Event
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Repeat this event on a schedule
                        </div>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("isRecurring") && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    {/* Recurrence Pattern */}
                    <FormField
                      control={form.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2">
                              {["daily", "weekly", "monthly", "yearly"].map(
                                (pattern) => (
                                  <Button
                                    key={pattern}
                                    type="button"
                                    variant={
                                      field.value === pattern
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => field.onChange(pattern)}
                                    disabled={isSubmitting}
                                    className="capitalize"
                                  >
                                    {pattern}
                                  </Button>
                                )
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recurrence Interval */}
                    <FormField
                      control={form.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat every</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="365"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 1)
                                }
                                disabled={isSubmitting}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground">
                                {form.watch("recurrencePattern")}(s)
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Days of Week - Only for weekly */}
                    {form.watch("recurrencePattern") === "weekly" && (
                      <FormField
                        control={form.control}
                        name="recurrenceDaysOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repeat on</FormLabel>
                            <FormControl>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { label: "Sun", value: 0 },
                                  { label: "Mon", value: 1 },
                                  { label: "Tue", value: 2 },
                                  { label: "Wed", value: 3 },
                                  { label: "Thu", value: 4 },
                                  { label: "Fri", value: 5 },
                                  { label: "Sat", value: 6 },
                                ].map((day) => (
                                  <Button
                                    key={day.value}
                                    type="button"
                                    variant={
                                      field.value?.includes(day.value)
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => {
                                      const current = field.value || [];
                                      if (current.includes(day.value)) {
                                        field.onChange(
                                          current.filter((d) => d !== day.value)
                                        );
                                      } else {
                                        field.onChange([...current, day.value]);
                                      }
                                    }}
                                    disabled={isSubmitting}
                                    className="w-12"
                                  >
                                    {day.label}
                                  </Button>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* End Date */}
                    <FormField
                      control={form.control}
                      name="recurrenceEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End date (optional)</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={field.value || new Date()}
                              onChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </>
            )}

            {/* Notes Attachment */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Attach Notes</label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setNoteDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Note
                </Button>
              </div>

              {/* Selected Notes */}
              {selectedNoteIds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Selected ({selectedNoteIds.length}):
                  </p>
                  <div className="space-y-2">
                    {selectedNoteIds.map((noteId) => {
                      const note = existingNotes.find((n) => n.id === noteId);
                      if (!note) return null;
                      return (
                        <div
                          key={noteId}
                          className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                        >
                          <span className="text-sm font-medium truncate flex-1">
                            {note.title}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSelectedNoteIds((prev) =>
                                prev.filter((id) => id !== noteId)
                              )
                            }
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Existing Notes List */}
              {existingNotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Or select from existing notes:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                    {existingNotes
                      .filter((note) => !selectedNoteIds.includes(note.id))
                      .map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() =>
                            setSelectedNoteIds((prev) => [...prev, note.id])
                          }
                          disabled={isSubmitting}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {note.title}
                            </div>
                            {note.category && (
                              <span className="text-xs text-muted-foreground">
                                {note.category}
                              </span>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {existingNotes.length === 0 && selectedNoteIds.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No existing notes available. Create a new note to attach.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>{isEditing ? "Update Event" : "Create Event"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Note Dialog for creating new notes */}
      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        onSuccess={() => {
          // Refresh notes list
          fetch("/api/notes?limit=100")
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                const unlinkedNotes = data.data.notes.filter(
                  (note: { linkedEventId?: string }) => !note.linkedEventId
                );
                setExistingNotes(unlinkedNotes);
                // Auto-select the newly created note (last one)
                if (unlinkedNotes.length > 0) {
                  const latestNote = unlinkedNotes[0];
                  setSelectedNoteIds((prev) => [...prev, latestNote.id]);
                }
              }
            })
            .catch((error) => {
              console.error("Error fetching notes:", error);
            });
        }}
      />

      {/* Calendar Dialog for creating new calendars */}
      <CalendarDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        onSuccess={(newCalendar) => {
          // Select the newly created calendar
          form.setValue("calendarId", newCalendar.id);
        }}
      />
    </Dialog>
  );
}

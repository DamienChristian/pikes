"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { LoadingSpinner } from "@/app/components/ui/loading-spinner";
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
import { useAppDispatch } from "@/app/lib/store/hooks";
import { fetchCalendars } from "@/app/lib/store/calendarsSlice";

const CALENDAR_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#F59E0B" },
  { name: "Pink", value: "#EC4899" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Teal", value: "#14B8A6" },
];

interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: UserCalendar | null;
}

type SettingsFormData = {
  name: string;
  color: string;
  isPublicJoinEnabled: boolean;
  defaultJoinRole: "viewer" | "editor";
};

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  calendar,
}: CalendarSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormData>({
    defaultValues: {
      name: "",
      color: "#3B82F6",
      isPublicJoinEnabled: false,
      defaultJoinRole: "viewer",
    },
  });

  // Watch the public join toggle to show share link in real-time
  const isPublicJoinEnabled = useWatch({
    control: form.control,
    name: "isPublicJoinEnabled",
  });

  useEffect(() => {
    if (open && calendar) {
      form.reset({
        name: calendar.name,
        color: calendar.color,
        isPublicJoinEnabled: calendar.isPublicJoinEnabled || false,
        defaultJoinRole: calendar.defaultJoinRole || "viewer",
      });
    }
  }, [open, calendar, form]);

  async function onSubmit(data: SettingsFormData) {
    if (!calendar) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/calendars/${calendar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          color: data.color,
          isPublicJoinEnabled: data.isPublicJoinEnabled,
          defaultJoinRole: data.defaultJoinRole,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update calendar");
      }
      toast.success("Calendar updated");
      dispatch(fetchCalendars());
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update calendar"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!calendar) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: "Calendar name is required",
                maxLength: {
                  value: 100,
                  message: "Name must be less than 100 characters",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Calendar name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {CALENDAR_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => field.onChange(color.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            field.value === color.value
                              ? "border-foreground scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublicJoinEnabled"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Allow anyone with the link to join
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Anyone with the share link can join this calendar.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {isPublicJoinEnabled && (
              <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="defaultJoinRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Join as</FormLabel>
                      <FormControl>
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="viewer"
                              checked={field.value === "viewer"}
                              onChange={() => field.onChange("viewer")}
                              className="accent-primary"
                            />
                            <span className="text-sm">Viewer</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="editor"
                              checked={field.value === "editor"}
                              onChange={() => field.onChange("editor")}
                              className="accent-primary"
                            />
                            <span className="text-sm">Editor</span>
                          </label>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {calendar.shareToken && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Share Link</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/calendar?join=${calendar.shareToken}`}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/calendar?join=${calendar.shareToken}`
                          );
                          toast.success("Link copied to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { toast } from "sonner";
import { UserCalendar } from "@/app/types";
import { useAppDispatch } from "@/app/lib/store/hooks";
import { createCalendar } from "@/app/lib/store/calendarsSlice";

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

interface CalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (calendar: UserCalendar) => void;
}

type CalendarFormData = {
  name: string;
  color: string;
};

export function CalendarDialog({
  open,
  onOpenChange,
  onSuccess,
}: CalendarDialogProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CalendarFormData>({
    defaultValues: {
      name: "",
      color: CALENDAR_COLORS[0].value,
    },
  });

  async function onSubmit(data: CalendarFormData) {
    setIsSubmitting(true);

    try {
      const newCalendar = await dispatch(
        createCalendar({ name: data.name.trim(), color: data.color })
      ).unwrap();

      toast.success(`Calendar "${data.name}" created`);
      form.reset();
      onOpenChange(false);
      onSuccess?.(newCalendar);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create calendar"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Calendar</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                    <Input
                      placeholder="Work, School, Fitness..."
                      {...field}
                      disabled={isSubmitting}
                      autoFocus
                    />
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
                      {CALENDAR_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => field.onChange(c.value)}
                          disabled={isSubmitting}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            field.value === c.value
                              ? "border-foreground scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
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
                    Creating...
                  </>
                ) : (
                  "Create Calendar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

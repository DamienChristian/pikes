"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MapPin, Plus, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { DateTimePicker } from "@/app/components/ui/date-time-picker";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    description?: string;
    deadline?: string | Date;
    completed?: boolean;
    color?: string;
    location?: string;
    category?: string;
  };
  onSuccess?: () => void;
}

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  deadline: z.date(),
  completed: z.boolean().default(false),
  color: z.string().default("#10B981"),
  location: z.string().max(200).optional().or(z.literal("")),
  category: z.string().max(50).optional().or(z.literal("")),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: TaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const isEditing = !!(task && task.id);

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

  const defaultDeadline = useMemo(() => {
    if (task?.deadline) {
      return typeof task.deadline === "string"
        ? new Date(task.deadline)
        : task.deadline;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    return tomorrow;
  }, [task]);

  const form = useForm<TaskFormValues>({
    defaultValues: {
      title: "",
      description: "",
      deadline: defaultDeadline,
      completed: false,
      color: "#10B981",
      location: "",
      category: "",
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        deadline:
          typeof task.deadline === "string"
            ? new Date(task.deadline)
            : task.deadline || defaultDeadline,
        completed: task.completed || false,
        color: task.color || "#10B981",
        location: task.location || "",
        category: task.category || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        deadline: defaultDeadline,
        completed: false,
        color: "#10B981",
        location: "",
        category: "",
      });
    }
  }, [task, form, defaultDeadline]);

  const onSubmit = async (data: TaskFormValues) => {
    try {
      setIsSubmitting(true);

      const endpoint = isEditing ? `/api/events/${task.id}` : "/api/events";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: "task",
          startDate: data.deadline,
          endDate: data.deadline,
          allDay: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save task");
      }

      toast.success(
        isEditing ? "Task updated successfully" : "Task created successfully"
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save task"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your task details"
              : "Add a new task with a deadline"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Task title"
                      {...field}
                      disabled={isSubmitting}
                    />
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
                    <Input
                      placeholder="Add details..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deadline */}
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deadline *</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
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

            {/* Category */}
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

            {/* Completed */}
            <FormField
              control={form.control}
              name="completed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mark as completed</FormLabel>
                  </div>
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
                    <div className="flex gap-2">
                      {[
                        "#10B981",
                        "#3B82F6",
                        "#F59E0B",
                        "#EF4444",
                        "#8B5CF6",
                        "#EC4899",
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="w-8 h-8 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor:
                              field.value === color
                                ? "currentColor"
                                : "transparent",
                            opacity: field.value === color ? 1 : 0.5,
                          }}
                          onClick={() => field.onChange(color)}
                          disabled={isSubmitting}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Task"
                    : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus, Check } from "lucide-react";
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
import { RichTextEditor } from "@/app/components/ui/rich-text-editor";
import { toast } from "sonner";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: {
    id: string;
    title: string;
    content: string;
    category?: string;
    linkedEventId?: string;
  };
  linkedEventId?: string;
  onSuccess?: () => void;
  readOnly?: boolean;
}

type NoteFormData = {
  title: string;
  content: string;
  category?: string;
};

export function NoteDialog({
  open,
  onOpenChange,
  note,
  linkedEventId,
  onSuccess,
  readOnly = false,
}: NoteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const isEditing = !!(note && note.id);

  const form = useForm<NoteFormData>({
    defaultValues: {
      title: note?.title || "",
      content: note?.content || "",
      category: note?.category || "",
    },
  });

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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: note?.title || "",
        content: note?.content || "",
        category: note?.category || "",
      });
      setShowCategoryInput(false);
      setNewCategory("");
    }
  }, [open, note, form]);

  async function onSubmit(data: NoteFormData) {
    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/notes/${note.id}` : "/api/notes";
      const method = isEditing ? "PATCH" : "POST";

      const payload: Record<string, unknown> = {
        title: data.title,
        content: data.content,
      };

      if (data.category) {
        payload.category = data.category;
      }

      if (linkedEventId) {
        payload.linkedEventId = linkedEventId;
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
          result.error || `Failed to ${isEditing ? "update" : "create"} note`
        );
      }

      toast.success(
        isEditing ? "Note updated successfully!" : "Note created successfully!"
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "create"} note`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? "View Note"
              : isEditing
                ? "Edit Note"
                : "Create New Note"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Note title"
                      {...field}
                      disabled={isSubmitting || readOnly}
                      autoFocus={!readOnly}
                    />
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
                              onClick={() => !readOnly && field.onChange(cat)}
                              disabled={isSubmitting || readOnly}
                            >
                              {field.value === cat && (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              {cat}
                            </Button>
                          ))}
                          {!readOnly && (
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
                          )}
                          {!readOnly && field.value && (
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

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content *</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Write your note here..."
                      disabled={isSubmitting || readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              {readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              ) : (
                <>
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
                      <>{isEditing ? "Update Note" : "Create Note"}</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

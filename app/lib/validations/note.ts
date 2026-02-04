import { z } from "zod";

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(50000, "Content must be less than 50000 characters"),
  category: z
    .string()
    .max(50, "Category must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  linkedEventId: z.string().optional().or(z.literal("")),
});

export const updateNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(50000, "Content must be less than 50000 characters")
    .optional(),
  category: z
    .string()
    .max(50, "Category must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  linkedEventId: z.string().optional().or(z.literal("")),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

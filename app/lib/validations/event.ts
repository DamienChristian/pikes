import { z } from "zod";

/**
 * Event Validation Schemas
 */
export const createEventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters")
      .trim(),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    startDate: z.coerce.date({
      message: "Start date is required",
    }),
    endDate: z.coerce.date({
      message: "End date is required",
    }),
    allDay: z.boolean().default(false),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
      .optional(),
    location: z
      .string()
      .max(200, "Location must be less than 200 characters")
      .optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().min(1, "Event ID is required"),
});

export const eventIdSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
});

export const dateRangeSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
});

/**
 * Query Parameter Schemas
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

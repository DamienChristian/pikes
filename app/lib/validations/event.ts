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
    type: z.enum(["event", "task"]).default("event"),
    deadline: z.coerce.date().optional(),
    completed: z.boolean().default(false),
    category: z.string().max(50).optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    isRecurring: z.boolean().default(false),
    recurrencePattern: z
      .enum(["daily", "weekly", "monthly", "yearly", "custom"])
      .optional(),
    recurrenceInterval: z.number().int().positive().default(1),
    recurrenceDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    recurrenceDayOfMonth: z.number().int().min(1).max(31).optional(),
    recurrenceEndDate: z.coerce.date().optional(),
    recurrenceCount: z.number().int().positive().optional(),
    calendarId: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

export const updateEventSchema = z
  .object({
    id: z.string().min(1, "Event ID is required"),
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters")
      .trim()
      .optional(),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    allDay: z.boolean().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
      .optional(),
    location: z
      .string()
      .max(200, "Location must be less than 200 characters")
      .optional(),
    type: z.enum(["event", "task"]).optional(),
    deadline: z.coerce.date().optional(),
    completed: z.boolean().optional(),
    category: z.string().max(50).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    isRecurring: z.boolean().optional(),
    recurrencePattern: z
      .enum(["daily", "weekly", "monthly", "yearly", "custom"])
      .optional(),
    recurrenceInterval: z.number().int().positive().optional(),
    recurrenceDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    recurrenceDayOfMonth: z.number().int().min(1).max(31).optional(),
    recurrenceEndDate: z.coerce.date().optional(),
    recurrenceCount: z.number().int().positive().optional(),
    calendarId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

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

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import Calendar from "@/app/lib/db/models/Calendar";
import { getSession } from "@/app/lib/utils/session";
import { updateEventSchema } from "@/app/lib/validations/event";

/**
 * Check if user has access to an event.
 * Returns "owner" | "editor" | "viewer" | null.
 * Checks: event owner > event-level members > calendar-level members.
 * The highest-privilege access is returned.
 */
async function getEventAccess(
  eventId: string,
  userId: string
): Promise<{ event: Record<string, unknown> | null; access: string | null }> {
  const event = await Event.findById(eventId).lean();
  if (!event) return { event: null, access: null };

  // Owner of the event
  if (event.userId === userId) return { event, access: "owner" };

  let access: string | null = null;

  // Check event-level sharing (direct member)
  const eventMembers =
    (event.members as Array<{ userId: string; role: string }>) || [];
  const eventMember = eventMembers.find((m) => m.userId === userId);
  if (eventMember) {
    access = eventMember.role; // "editor" or "viewer"
  }

  // Check via shared calendar (may upgrade access)
  if (event.calendarId) {
    const cal = await Calendar.findById(event.calendarId).lean();
    if (cal) {
      // Calendar owner has full access
      if (cal.userId === userId) {
        return { event, access: "owner" };
      }
      const calMember = cal.members?.find((m) => m.userId === userId);
      if (calMember) {
        // Take the highest privilege: editor > viewer
        if (!access || (calMember.role === "editor" && access === "viewer")) {
          access = calMember.role;
        }
      }
    }
  }

  if (access) return { event, access };
  return { event: null, access: null };
}

/**
 * GET /api/events/[id]
 * Get a specific event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectDB();

    const { event, access } = await getEventAccess(id, session.userId);

    if (!event || !access) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          event: {
            id: event._id.toString(),
            title: event.title,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            allDay: event.allDay,
            color: event.color,
            location: event.location,
            type: event.type,
            deadline: event.deadline,
            completed: event.completed,
            category: event.category,
            priority: event.priority,
            isRecurring: event.isRecurring,
            recurrencePattern: event.recurrencePattern,
            recurrenceInterval: event.recurrenceInterval,
            recurrenceDaysOfWeek: event.recurrenceDaysOfWeek,
            recurrenceDayOfMonth: event.recurrenceDayOfMonth,
            recurrenceEndDate: event.recurrenceEndDate,
            recurrenceCount: event.recurrenceCount,
            parentEventId: event.parentEventId,
            originalDate: event.originalDate,
            calendarId: event.calendarId,
            members: event.members || [],
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get event error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch event. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 * Update an existing event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = updateEventSchema.parse({ ...body, id });

    await connectDB();

    // Find and verify access (owner or editor on shared calendar)
    const { event: existingEvent, access } = await getEventAccess(
      id,
      session.userId
    );

    if (!existingEvent || !access) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Viewers cannot edit
    if (access === "viewer") {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to edit this event.",
        },
        { status: 403 }
      );
    }

    // Update event
    const updateData: Record<string, unknown> = {};
    if (validatedData.title !== undefined)
      updateData.title = validatedData.title;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.startDate !== undefined)
      updateData.startDate = validatedData.startDate;
    if (validatedData.endDate !== undefined)
      updateData.endDate = validatedData.endDate;
    if (validatedData.allDay !== undefined)
      updateData.allDay = validatedData.allDay;
    if (validatedData.color !== undefined)
      updateData.color = validatedData.color;
    if (validatedData.location !== undefined)
      updateData.location = validatedData.location;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.deadline !== undefined)
      updateData.deadline = validatedData.deadline;
    if (validatedData.completed !== undefined)
      updateData.completed = validatedData.completed;
    if (validatedData.category !== undefined)
      updateData.category = validatedData.category;
    if (validatedData.priority !== undefined)
      updateData.priority = validatedData.priority;
    if (validatedData.isRecurring !== undefined)
      updateData.isRecurring = validatedData.isRecurring;
    if (validatedData.recurrencePattern !== undefined)
      updateData.recurrencePattern = validatedData.recurrencePattern;
    if (validatedData.recurrenceInterval !== undefined)
      updateData.recurrenceInterval = validatedData.recurrenceInterval;
    if (validatedData.recurrenceDaysOfWeek !== undefined)
      updateData.recurrenceDaysOfWeek = validatedData.recurrenceDaysOfWeek;
    if (validatedData.recurrenceDayOfMonth !== undefined)
      updateData.recurrenceDayOfMonth = validatedData.recurrenceDayOfMonth;
    if (validatedData.recurrenceEndDate !== undefined)
      updateData.recurrenceEndDate = validatedData.recurrenceEndDate;
    if (validatedData.recurrenceCount !== undefined)
      updateData.recurrenceCount = validatedData.recurrenceCount;
    if (validatedData.calendarId !== undefined)
      updateData.calendarId = validatedData.calendarId;

    // If recurrence is being turned off, clear all recurrence fields
    const unsetData: Record<string, 1> = {};
    if (validatedData.isRecurring === false) {
      unsetData.recurrencePattern = 1;
      unsetData.recurrenceInterval = 1;
      unsetData.recurrenceDaysOfWeek = 1;
      unsetData.recurrenceDayOfMonth = 1;
      unsetData.recurrenceEndDate = 1;
      unsetData.recurrenceCount = 1;
      unsetData.parentEventId = 1;
      unsetData.originalDate = 1;
      // Remove recurrence keys from updateData so they don't conflict with $unset
      delete updateData.recurrencePattern;
      delete updateData.recurrenceInterval;
      delete updateData.recurrenceDaysOfWeek;
      delete updateData.recurrenceDayOfMonth;
      delete updateData.recurrenceEndDate;
      delete updateData.recurrenceCount;
    }

    const updateOps: Record<string, unknown> = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateOps.$unset = unsetData;
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          event: {
            id: updatedEvent!._id.toString(),
            title: updatedEvent!.title,
            description: updatedEvent!.description,
            startDate: updatedEvent!.startDate,
            endDate: updatedEvent!.endDate,
            allDay: updatedEvent!.allDay,
            color: updatedEvent!.color,
            location: updatedEvent!.location,
            type: updatedEvent!.type,
            deadline: updatedEvent!.deadline,
            completed: updatedEvent!.completed,
            category: updatedEvent!.category,
            priority: updatedEvent!.priority,
            isRecurring: updatedEvent!.isRecurring,
            recurrencePattern: updatedEvent!.recurrencePattern,
            recurrenceInterval: updatedEvent!.recurrenceInterval,
            recurrenceDaysOfWeek: updatedEvent!.recurrenceDaysOfWeek,
            recurrenceDayOfMonth: updatedEvent!.recurrenceDayOfMonth,
            recurrenceEndDate: updatedEvent!.recurrenceEndDate,
            recurrenceCount: updatedEvent!.recurrenceCount,
            parentEventId: updatedEvent!.parentEventId,
            originalDate: updatedEvent!.originalDate,
            calendarId: updatedEvent!.calendarId,
            members: updatedEvent!.members || [],
            createdAt: updatedEvent!.createdAt,
            updatedAt: updatedEvent!.updatedAt,
          },
        },
        message: "Event updated successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update event error:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details:
            "issues" in error
              ? (error as unknown as { issues: unknown }).issues
              : undefined,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update event. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectDB();

    // Find and verify access (owner or editor on shared calendar)
    const { event: existingEvent, access } = await getEventAccess(
      id,
      session.userId
    );

    if (!existingEvent || !access) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Viewers cannot delete
    if (access === "viewer") {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to delete this event.",
        },
        { status: 403 }
      );
    }

    const event = await Event.findById(id);

    // Delete event
    await Event.findByIdAndDelete(id);

    // If this is a recurring parent, delete all child instances
    if (event?.isRecurring) {
      await Event.deleteMany({
        parentEventId: id,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Event deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete event error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete event. Please try again.",
      },
      { status: 500 }
    );
  }
}

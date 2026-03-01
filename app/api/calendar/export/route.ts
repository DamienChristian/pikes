import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import Calendar from "@/app/lib/db/models/Calendar";
import { getSession } from "@/app/lib/utils/session";
import { eventsToICS } from "@/app/lib/utils/ics";
import { CalendarEvent } from "@/app/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type"); // 'event', 'task', or null for all
    const calendarIds = searchParams.get("calendarIds"); // comma-separated list

    // Build query
    const query: Record<string, unknown> = {
      userId: session.userId,
      parentEventId: { $exists: false }, // Exclude recurring instances
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        (query.startDate as Record<string, unknown>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.startDate as Record<string, unknown>).$lte = new Date(endDate);
      }
    }

    // Add type filter if provided
    if (type && (type === "event" || type === "task")) {
      query.type = type;
    }

    // Add calendar filter if provided
    if (calendarIds) {
      const ids = calendarIds.split(",").filter(Boolean);
      if (ids.length > 0) {
        query.calendarId = { $in: ids };
      }
    }

    // Fetch events
    const events = await Event.find(query).lean();

    // Convert to CalendarEvent format
    const calendarEvents: CalendarEvent[] = events.map((event) => ({
      id: event._id.toString(),
      userId: event.userId,
      title: event.title,
      description: event.description || "",
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay,
      location: event.location || "",
      category: event.category || "",
      priority: event.priority,
      type: event.type,
      completed: event.completed,
      deadline: event.deadline,
      isRecurring: event.isRecurring,
      recurrencePattern: event.recurrencePattern,
      recurrenceInterval: event.recurrenceInterval,
      recurrenceDaysOfWeek: event.recurrenceDaysOfWeek,
      recurrenceEndDate: event.recurrenceEndDate,
      recurrenceCount: event.recurrenceCount,
      parentEventId: event.parentEventId,
      originalDate: event.originalDate,
      calendarId: event.calendarId?.toString(),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    // Build calendar name info for ICS X-WR-CALNAME and per-event CATEGORIES
    const involvedCalendarIds = [
      ...new Set(
        calendarEvents.map((e) => e.calendarId).filter(Boolean) as string[]
      ),
    ];
    const calendarDocs = involvedCalendarIds.length
      ? await Calendar.find({ _id: { $in: involvedCalendarIds } }).lean()
      : [];

    const calendarMap: Record<string, string> = {};
    calendarDocs.forEach((c) => {
      calendarMap[c._id.toString()] = c.name;
    });

    // For the VCALENDAR header name: use the single calendar name, or join multiple
    const calendarNames = calendarDocs.map((c) => c.name);
    const calendarName =
      calendarNames.length === 1
        ? calendarNames[0]
        : calendarNames.length > 1
          ? calendarNames.join(", ")
          : "My Calendar";

    // Filename: sanitise for Content-Disposition
    const safeFilename = calendarName
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    // Convert to ICS format
    const icsContent = eventsToICS(calendarEvents, {
      calendarName,
      calendarMap,
    });

    // Return ICS file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar;charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename}-export.ics"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export calendar" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import { getSession } from "@/app/lib/utils/session";
import { parseICS, ParsedICSEvent } from "@/app/lib/utils/ics";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Get ICS content or URL from request body
    const body = await request.json();
    const { icsContent, icsUrl } = body;

    let contentToParse = icsContent;

    // If URL is provided, fetch the ICS content
    if (icsUrl && typeof icsUrl === "string") {
      try {
        // Convert webcal:// to https://
        const normalizedUrl = icsUrl.replace(/^webcal:\/\//i, "https://");

        // Validate URL
        new URL(normalizedUrl); // Throws if invalid

        // Fetch ICS content from URL
        const fetchResponse = await fetch(normalizedUrl, {
          headers: {
            "User-Agent": "Calendar-App/1.0",
          },
        });

        if (!fetchResponse.ok) {
          throw new Error(
            `Failed to fetch calendar: ${fetchResponse.statusText}`
          );
        }

        contentToParse = await fetchResponse.text();
      } catch (error) {
        console.error("URL fetch error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch calendar from URL";
        return NextResponse.json(
          {
            error: `Failed to fetch calendar from URL. ${errorMessage}`,
          },
          { status: 400 }
        );
      }
    }

    if (!contentToParse || typeof contentToParse !== "string") {
      return NextResponse.json(
        { error: "Invalid ICS content or URL" },
        { status: 400 }
      );
    }

    // Parse ICS file
    let parsedEvents: ParsedICSEvent[];
    try {
      parsedEvents = parseICS(contentToParse);
    } catch (error) {
      console.error("ICS parsing error:", error);
      return NextResponse.json(
        {
          error:
            "Failed to parse ICS file. Please ensure it's a valid iCalendar file.",
        },
        { status: 400 }
      );
    }

    if (parsedEvents.length === 0) {
      return NextResponse.json(
        { error: "No events found in ICS file" },
        { status: 400 }
      );
    }

    // Convert parsed events to our format and insert
    const now = new Date();
    const eventsToInsert = parsedEvents.map((event) => ({
      userId: session.userId,
      title: event.title,
      description: event.description || "",
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay,
      location: event.location || "",
      category: event.category || "",
      priority: event.priority || "medium",
      type: "event", // Default to event (not task)
      completed: false,
      isRecurring: !!event.recurrence?.pattern,
      recurrencePattern: event.recurrence?.pattern,
      recurrenceInterval: event.recurrence?.interval || 1,
      recurrenceDaysOfWeek: event.recurrence?.daysOfWeek,
      recurrenceEndDate: event.recurrence?.endDate,
      recurrenceCount: event.recurrence?.count,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await Event.insertMany(eventsToInsert);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.length} events`,
      count: result.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import calendar" },
      { status: 500 }
    );
  }
}

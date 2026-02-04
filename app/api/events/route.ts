import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import { getSession } from "@/app/lib/utils/session";
import {
  createEventSchema,
  paginationSchema,
  dateRangeSchema,
} from "@/app/lib/validations/event";
import { rateLimit, getRateLimitHeaders } from "@/app/lib/utils/rate-limit";

/**
 * GET /api/events
 * List all events for the authenticated user
 * Query params: page, limit, start, end (date range filter)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // Validate pagination
    const paginationData = paginationSchema.parse({
      page: page || 1,
      limit: limit || 20,
    });

    await connectDB();

    // Build query
    const query: Record<string, unknown> = {
      userId: session.userId,
    };

    // Add date range filter if provided
    if (start && end) {
      const dateRange = dateRangeSchema.parse({ start, end });
      query.startDate = { $lte: dateRange.end };
      query.endDate = { $gte: dateRange.start };
    }

    // Calculate pagination
    const skip = (paginationData.page - 1) * paginationData.limit;

    // Fetch events with pagination
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(paginationData.limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    // Format events for response
    const formattedEvents = events.map((event) => ({
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
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          events: formattedEvents,
          pagination: {
            page: paginationData.page,
            limit: paginationData.limit,
            total,
            totalPages: Math.ceil(total / paginationData.limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get events error:", error);

    // Handle validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError" &&
      "errors" in error
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting by user
    const rateLimitResult = rateLimit(`create-event:${session.userId}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 events per minute
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please slow down.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetTime
          ),
        }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = createEventSchema.parse(body);

    await connectDB();

    // Create event
    const event = await Event.create({
      ...validatedData,
      userId: session.userId,
    });

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
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          },
        },
        message: "Event created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create event error:", error);

    // Handle validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError" &&
      "errors" in error
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event. Please try again.",
      },
      { status: 500 }
    );
  }
}

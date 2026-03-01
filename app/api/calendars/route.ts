import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Calendar from "@/app/lib/db/models/Calendar";
import { getSession } from "@/app/lib/utils/session";

/**
 * GET /api/calendars
 * List all calendars for the authenticated user.
 * Auto-creates a default "Personal" calendar if none exist.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    let calendars = await Calendar.find({ userId: session.userId })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    // Auto-create a default calendar if the user has none
    if (calendars.length === 0) {
      const defaultCalendar = await Calendar.create({
        userId: session.userId,
        name: "Personal",
        color: "#3B82F6",
        isVisible: true,
        isDefault: true,
        source: "local",
      });

      calendars = [defaultCalendar.toObject()];
    }

    const formatted = calendars.map((cal) => ({
      id: cal._id.toString(),
      userId: cal.userId,
      name: cal.name,
      color: cal.color,
      isVisible: cal.isVisible,
      isDefault: cal.isDefault,
      source: cal.source,
      sourceUrl: cal.sourceUrl,
      createdAt: cal.createdAt,
      updatedAt: cal.updatedAt,
    }));

    return NextResponse.json(
      { success: true, data: { calendars: formatted } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get calendars error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calendars." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendars
 * Create a new calendar
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, color, source, sourceUrl } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Calendar name is required." },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Calendar name must be less than 100 characters.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const calendar = await Calendar.create({
      userId: session.userId,
      name: name.trim(),
      color: color || "#3B82F6",
      isVisible: true,
      isDefault: false,
      source: source || "local",
      sourceUrl: sourceUrl || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          calendar: {
            id: calendar._id.toString(),
            userId: calendar.userId,
            name: calendar.name,
            color: calendar.color,
            isVisible: calendar.isVisible,
            isDefault: calendar.isDefault,
            source: calendar.source,
            sourceUrl: calendar.sourceUrl,
            createdAt: calendar.createdAt,
            updatedAt: calendar.updatedAt,
          },
        },
        message: "Calendar created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create calendar error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create calendar." },
      { status: 500 }
    );
  }
}

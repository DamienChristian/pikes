import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Calendar from "@/app/lib/db/models/Calendar";
import { getSession } from "@/app/lib/utils/session";

/**
 * POST /api/calendars/join
 * Join a shared calendar via share token.
 * Body: { token: string }
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
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Share token is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const calendar = await Calendar.findOne({ shareToken: token });

    if (!calendar) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired share link." },
        { status: 404 }
      );
    }

    // Check if public join is enabled
    if (!calendar.isPublicJoinEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "This calendar does not allow joining via link.",
        },
        { status: 403 }
      );
    }

    // Can't join your own calendar
    if (calendar.userId === session.userId) {
      return NextResponse.json(
        { success: false, error: "You already own this calendar." },
        { status: 400 }
      );
    }

    // Check if already a member
    const existing = calendar.members?.find((m) => m.userId === session.userId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this calendar." },
        { status: 409 }
      );
    }

    // Add with the calendar's configured default join role
    const joinRole = calendar.defaultJoinRole || "viewer";
    await Calendar.findByIdAndUpdate(calendar._id, {
      $push: {
        members: {
          userId: session.userId,
          role: joinRole,
          addedAt: new Date(),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          calendarId: calendar._id.toString(),
          calendarName: calendar.name,
        },
        message: `Joined "${calendar.name}" successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Join calendar error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join calendar." },
      { status: 500 }
    );
  }
}

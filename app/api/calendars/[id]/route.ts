import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Calendar from "@/app/lib/db/models/Calendar";
import Event from "@/app/lib/db/models/Event";
import { getSession } from "@/app/lib/utils/session";

/**
 * PATCH /api/calendars/[id]
 * Update a calendar (name, color, visibility)
 */
export async function PATCH(
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
    const body = await request.json();

    await connectDB();

    const calendar = await Calendar.findOne({
      _id: id,
      userId: session.userId,
    });

    if (!calendar) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;

    const updated = await Calendar.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          calendar: {
            id: updated!._id.toString(),
            userId: updated!.userId,
            name: updated!.name,
            color: updated!.color,
            isVisible: updated!.isVisible,
            isDefault: updated!.isDefault,
            source: updated!.source,
            sourceUrl: updated!.sourceUrl,
            createdAt: updated!.createdAt,
            updatedAt: updated!.updatedAt,
          },
        },
        message: "Calendar updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update calendar error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update calendar." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendars/[id]
 * Delete a calendar and all its events
 */
export async function DELETE(
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

    const calendar = await Calendar.findOne({
      _id: id,
      userId: session.userId,
    });

    if (!calendar) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    // Prevent deleting the default calendar
    if (calendar.isDefault) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the default calendar." },
        { status: 400 }
      );
    }

    // Delete all events in this calendar
    await Event.deleteMany({
      calendarId: id,
      userId: session.userId,
    });

    // Delete the calendar
    await Calendar.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
        message: "Calendar and its events deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete calendar error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete calendar." },
      { status: 500 }
    );
  }
}

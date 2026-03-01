import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Calendar from "@/app/lib/db/models/Calendar";
import Event from "@/app/lib/db/models/Event";
import { getSession } from "@/app/lib/utils/session";

/**
 * PATCH /api/calendars/[id]
 * Update a calendar (name, color, visibility, sharing settings)
 * Owner can update everything; members can only toggle their own visibility.
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

    const calendar = await Calendar.findById(id);

    if (!calendar) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    const isOwner = calendar.userId === session.userId;
    const isMember = calendar.members?.some((m) => m.userId === session.userId);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (isOwner) {
      // Owner can update name, color, visibility, sharing settings
      if (body.name !== undefined) updateData.name = body.name;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
      if (body.isPublicJoinEnabled !== undefined)
        updateData.isPublicJoinEnabled = body.isPublicJoinEnabled;
      if (body.defaultJoinRole !== undefined)
        updateData.defaultJoinRole = body.defaultJoinRole;
    } else {
      // Members can only toggle their own visibility
      if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
    }

    // Apply updates to the fetched document and save (triggers pre-save hook
    // which auto-generates shareToken if missing)
    Object.assign(calendar, updateData);
    const updated = await calendar.save();

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
 * Owner: delete the calendar and all its events
 * Member: leave the calendar (remove themselves from members)
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

    const calendar = await Calendar.findById(id);

    if (!calendar) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    const isOwner = calendar.userId === session.userId;
    const isMember = calendar.members?.some((m) => m.userId === session.userId);

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    // Member leaving the calendar
    if (!isOwner && isMember) {
      await Calendar.findByIdAndUpdate(id, {
        $pull: { members: { userId: session.userId } },
      });
      return NextResponse.json(
        { success: true, message: "Left the calendar successfully" },
        { status: 200 }
      );
    }

    // Owner deleting
    if (calendar.isDefault) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the default calendar." },
        { status: 400 }
      );
    }

    // Delete all events in this calendar
    await Event.deleteMany({ calendarId: id });

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

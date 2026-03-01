import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import Calendar from "@/app/lib/db/models/Calendar";
import User from "@/app/lib/db/models/User";
import { getSession } from "@/app/lib/utils/session";

/**
 * Check if user is the owner of the event, or an editor on its calendar.
 * Only owners (and calendar editors who created it) can manage event sharing.
 */
async function canManageEventSharing(
  eventId: string,
  userId: string
): Promise<{
  event: Record<string, unknown> | null;
  allowed: boolean;
}> {
  const event = await Event.findById(eventId).lean<Record<string, unknown>>();
  if (!event) return { event: null, allowed: false };

  // Event owner can always manage sharing
  if (event.userId === userId) return { event, allowed: true };

  // Calendar editors who have "editor" access can also manage event sharing
  if (event.calendarId) {
    const cal = await Calendar.findById(event.calendarId).lean();
    if (cal) {
      if (cal.userId === userId) return { event, allowed: true };
      const member = cal.members?.find((m) => m.userId === userId);
      if (member?.role === "editor") return { event, allowed: true };
    }
  }

  return { event: null, allowed: false };
}

/**
 * GET /api/events/[id]/share
 * Get sharing info for an event (members list + calendar members)
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

    const { event, allowed } = await canManageEventSharing(id, session.userId);
    if (!event || !allowed) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Populate event member info
    const members = (event.members as Array<Record<string, unknown>>) || [];
    const memberUserIds = members.map((m) => m.userId as string);

    // Also fetch calendar members if event belongs to a calendar
    let calendarMembers: Array<{
      userId: string;
      role: string;
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    }> = [];

    if (event.calendarId) {
      const cal = await Calendar.findById(event.calendarId).lean();
      if (cal && cal.members && cal.members.length > 0) {
        const calMemberUserIds = cal.members.map((m) => m.userId);
        const calUsers = await User.find({ _id: { $in: calMemberUserIds } })
          .select("username email firstName lastName avatarUrl")
          .lean();
        const calUserMap = new Map(calUsers.map((u) => [u._id.toString(), u]));

        calendarMembers = cal.members.map((m) => {
          const u = calUserMap.get(m.userId);
          return {
            userId: m.userId,
            role: m.role,
            username: u?.username,
            email: u?.email,
            firstName: u?.firstName,
            lastName: u?.lastName,
            avatarUrl: u?.avatarUrl,
          };
        });
      }
    }

    // Collect all user IDs to populate
    const allUserIds = [
      ...new Set([...memberUserIds, ...calendarMembers.map((m) => m.userId)]),
    ];
    const users =
      allUserIds.length > 0
        ? await User.find({ _id: { $in: allUserIds } })
            .select("username email firstName lastName avatarUrl")
            .lean()
        : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const enrichedMembers = members.map((m) => {
      const u = userMap.get(m.userId as string);
      return {
        userId: m.userId as string,
        role: m.role as string,
        addedAt: m.addedAt,
        username: u?.username,
        email: u?.email,
        firstName: u?.firstName,
        lastName: u?.lastName,
        avatarUrl: u?.avatarUrl,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        members: enrichedMembers,
        calendarMembers,
      },
    });
  } catch (error) {
    console.error("Get event share info error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get sharing info." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/share
 * Add a member by username or email
 * Body: { usernameOrEmail: string, role: "viewer" | "editor" }
 */
export async function POST(
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
    const { usernameOrEmail, role = "viewer" } = body;

    if (!usernameOrEmail || typeof usernameOrEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Username or email is required." },
        { status: 400 }
      );
    }

    if (!["viewer", "editor"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Role must be 'viewer' or 'editor'." },
        { status: 400 }
      );
    }

    await connectDB();

    const { event, allowed } = await canManageEventSharing(id, session.userId);
    if (!event || !allowed) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Find the target user
    const input = usernameOrEmail.trim().toLowerCase();
    const targetUser = await User.findOne({
      $or: [{ email: input }, { username: input }],
    })
      .select("_id username email firstName lastName avatarUrl")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    const targetUserId = targetUser._id.toString();

    // Can't add yourself
    if (targetUserId === session.userId) {
      return NextResponse.json(
        { success: false, error: "You cannot add yourself." },
        { status: 400 }
      );
    }

    // Check if already a member
    const members = (event.members as Array<{ userId: string }>) || [];
    const existing = members.find((m) => m.userId === targetUserId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "User is already a member of this event." },
        { status: 409 }
      );
    }

    // Add the member
    await Event.findByIdAndUpdate(id, {
      $push: {
        members: {
          userId: targetUserId,
          role,
          addedAt: new Date(),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          member: {
            userId: targetUserId,
            role,
            addedAt: new Date(),
            username: targetUser.username,
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            avatarUrl: targetUser.avatarUrl,
          },
        },
        message: "Member added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add event member error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add member." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]/share
 * Remove a member. Body: { userId: string }
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
    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "userId is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const { event, allowed } = await canManageEventSharing(id, session.userId);
    if (!event || !allowed) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    await Event.findByIdAndUpdate(id, {
      $pull: { members: { userId: targetUserId } },
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove event member error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove member." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]/share
 * Update a member's role. Body: { userId: string, role: "viewer" | "editor" }
 * Or update sharing settings: { isPublicJoinEnabled: boolean, defaultJoinRole: string }
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

    const { event, allowed } = await canManageEventSharing(id, session.userId);
    if (!event || !allowed) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Update member role
    const { userId: targetUserId, role } = body;

    if (!targetUserId || !role) {
      return NextResponse.json(
        { success: false, error: "userId and role are required." },
        { status: 400 }
      );
    }

    if (!["viewer", "editor"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Role must be 'viewer' or 'editor'." },
        { status: 400 }
      );
    }

    await Event.findOneAndUpdate(
      { _id: id, "members.userId": targetUserId },
      { $set: { "members.$.role": role } }
    );

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Update event share error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update sharing." },
      { status: 500 }
    );
  }
}

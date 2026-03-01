import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Calendar from "@/app/lib/db/models/Calendar";
import User from "@/app/lib/db/models/User";
import { getSession } from "@/app/lib/utils/session";

/**
 * GET /api/calendars/[id]/share
 * Get sharing info for a calendar (members, link, settings)
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

    const calendar = await Calendar.findOne({
      _id: id,
      userId: session.userId,
    }).lean();

    if (!calendar) {
      return NextResponse.json(
        { success: false, error: "Calendar not found" },
        { status: 404 }
      );
    }

    // Populate member info
    const memberUserIds = (calendar.members || []).map((m) => m.userId);
    const users =
      memberUserIds.length > 0
        ? await User.find({ _id: { $in: memberUserIds } })
            .select("username email firstName lastName avatarUrl")
            .lean()
        : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const members = (calendar.members || []).map((m) => {
      const u = userMap.get(m.userId);
      return {
        userId: m.userId,
        role: m.role,
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
        members,
        isPublicJoinEnabled: calendar.isPublicJoinEnabled || false,
        shareToken: calendar.shareToken,
      },
    });
  } catch (error) {
    console.error("Get share info error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get sharing info." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendars/[id]/share
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

    // Only the owner can add members
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
    const existing = calendar.members?.find((m) => m.userId === targetUserId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "User is already a member of this calendar." },
        { status: 409 }
      );
    }

    // Add the member
    await Calendar.findByIdAndUpdate(id, {
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
    console.error("Add member error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add member." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendars/[id]/share
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

    await Calendar.findByIdAndUpdate(id, {
      $pull: { members: { userId: targetUserId } },
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove member." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendars/[id]/share
 * Update a member's role. Body: { userId: string, role: "viewer" | "editor" }
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

    await Calendar.findOneAndUpdate(
      { _id: id, "members.userId": targetUserId },
      { $set: { "members.$.role": role } }
    );

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Update member role error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update member role." },
      { status: 500 }
    );
  }
}

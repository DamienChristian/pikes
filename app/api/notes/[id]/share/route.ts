import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Note from "@/app/lib/db/models/Note";
import User from "@/app/lib/db/models/User";
import { getSession } from "@/app/lib/utils/session";

/**
 * Check if user is the owner of the note.
 * Only owners can manage note sharing.
 */
async function canManageNoteSharing(
  noteId: string,
  userId: string
): Promise<{ note: Record<string, unknown> | null; allowed: boolean }> {
  const note = await Note.findById(noteId).lean<Record<string, unknown>>();
  if (!note) return { note: null, allowed: false };
  if (note.userId?.toString() === userId) return { note, allowed: true };
  return { note: null, allowed: false };
}

/**
 * GET /api/notes/[id]/share
 * Get sharing info for a note (members list)
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

    const { note, allowed } = await canManageNoteSharing(id, session.userId);
    if (!note || !allowed) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    // Populate member info
    const members = (note.members as Array<Record<string, unknown>>) || [];
    const memberUserIds = members.map((m) => m.userId as string);
    const users =
      memberUserIds.length > 0
        ? await User.find({ _id: { $in: memberUserIds } })
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
      data: { members: enrichedMembers },
    });
  } catch (error) {
    console.error("Get note share info error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get sharing info." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/[id]/share
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

    const { note, allowed } = await canManageNoteSharing(id, session.userId);
    if (!note || !allowed) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
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

    if (targetUserId === session.userId) {
      return NextResponse.json(
        { success: false, error: "You cannot add yourself." },
        { status: 400 }
      );
    }

    const members = (note.members as Array<{ userId: string }>) || [];
    if (members.find((m) => m.userId === targetUserId)) {
      return NextResponse.json(
        { success: false, error: "User is already a member of this note." },
        { status: 409 }
      );
    }

    await Note.findByIdAndUpdate(id, {
      $push: {
        members: { userId: targetUserId, role, addedAt: new Date() },
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
    console.error("Add note member error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add member." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]/share
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

    const { note, allowed } = await canManageNoteSharing(id, session.userId);
    if (!note || !allowed) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    await Note.findByIdAndUpdate(id, {
      $pull: { members: { userId: targetUserId } },
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove note member error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove member." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]/share
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

    const { note, allowed } = await canManageNoteSharing(id, session.userId);
    if (!note || !allowed) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    await Note.findOneAndUpdate(
      { _id: id, "members.userId": targetUserId },
      { $set: { "members.$.role": role } }
    );

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error("Update note member role error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update role." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Note from "@/app/lib/db/models/Note";
import { getSession } from "@/app/lib/utils/session";
import { updateNoteSchema } from "@/app/lib/validations/note";

/**
 * Returns "owner" | "editor" | "viewer" | null for a given user on a note.
 */
async function getNoteAccess(
  noteId: string,
  userId: string
): Promise<{ note: typeof Note.prototype | null; access: string | null }> {
  const note = await Note.findById(noteId);
  if (!note) return { note: null, access: null };

  if (note.userId.toString() === userId) return { note, access: "owner" };

  const member = note.members?.find(
    (m: { userId: string }) => m.userId === userId
  );
  if (member) return { note, access: member.role };

  return { note: null, access: null };
}

/**
 * GET /api/notes/[id]
 * Get a specific note (owner + any member)
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

    const { note, access } = await getNoteAccess(id, session.userId);

    if (!note || !access) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        note: {
          id: note._id.toString(),
          userId: note.userId.toString(),
          title: note.title,
          content: note.content,
          category: note.category,
          linkedEventId: note.linkedEventId?.toString(),
          members: (note.members || []).map(
            (m: { userId: string; role: string; addedAt: Date }) => ({
              userId: m.userId,
              role: m.role,
              addedAt: m.addedAt,
            })
          ),
          isOwner: access === "owner",
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 * Update a note
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
    const validatedData = updateNoteSchema.parse(body);

    await connectDB();

    const { note, access } = await getNoteAccess(id, session.userId);

    if (!note || !access) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    if (access === "viewer") {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to edit this note.",
        },
        { status: 403 }
      );
    }

    if (validatedData.title !== undefined) {
      note.title = validatedData.title;
    }
    if (validatedData.content !== undefined) {
      note.content = validatedData.content;
    }
    if (validatedData.category !== undefined) {
      note.category = validatedData.category || undefined;
    }
    if (validatedData.linkedEventId !== undefined) {
      note.linkedEventId = validatedData.linkedEventId || undefined;
    }

    await note.save();

    return NextResponse.json({
      success: true,
      data: {
        note: {
          id: note._id.toString(),
          userId: note.userId.toString(),
          title: note.title,
          content: note.content,
          category: note.category,
          linkedEventId: note.linkedEventId?.toString(),
          members: (note.members || []).map(
            (m: { userId: string; role: string; addedAt: Date }) => ({
              userId: m.userId,
              role: m.role,
              addedAt: m.addedAt,
            })
          ),
          isOwner: access === "owner",
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error updating note:", error);

    if (
      error instanceof Error &&
      "name" in error &&
      error.name === "ZodError"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update note" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note
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

    // Only the owner can delete a note
    const note = await Note.findOneAndDelete({
      _id: id,
      userId: session.userId,
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "Note deleted successfully" },
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete note" },
      { status: 500 }
    );
  }
}

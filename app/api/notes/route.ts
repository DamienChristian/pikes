import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Note from "@/app/lib/db/models/Note";
import { getSession } from "@/app/lib/utils/session";
import { createNoteSchema } from "@/app/lib/validations/note";

/**
 * GET /api/notes
 * List all notes for the authenticated user
 * Query params: limit, category, linkedEventId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const category = searchParams.get("category");
    const linkedEventId = searchParams.get("linkedEventId");

    await connectDB();

    const query: Record<string, unknown> = {
      userId: session.userId,
    };

    if (category) {
      query.category = category;
    }

    if (linkedEventId) {
      query.linkedEventId = linkedEventId;
    }

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedNotes = notes.map((note) => ({
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      category: note.category,
      linkedEventId: note.linkedEventId?.toString(),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: { notes: formattedNotes },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Create a new note
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
    const validatedData = createNoteSchema.parse(body);

    await connectDB();

    const noteData: {
      userId: string;
      title: string;
      content: string;
      category?: string;
      linkedEventId?: string;
    } = {
      userId: session.userId,
      title: validatedData.title,
      content: validatedData.content,
    };

    if (validatedData.category) {
      noteData.category = validatedData.category;
    }

    if (validatedData.linkedEventId) {
      noteData.linkedEventId = validatedData.linkedEventId;
    }

    const note = await Note.create(noteData);

    return NextResponse.json(
      {
        success: true,
        data: {
          note: {
            id: note._id.toString(),
            title: note.title,
            content: note.content,
            category: note.category,
            linkedEventId: note.linkedEventId?.toString(),
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating note:", error);

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
      { success: false, error: "Failed to create note" },
      { status: 500 }
    );
  }
}

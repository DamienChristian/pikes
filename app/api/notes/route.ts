import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/app/lib/db/mongodb";
import Note from "@/app/lib/db/models/Note";
import Event from "@/app/lib/db/models/Event";
import Calendar from "@/app/lib/db/models/Calendar";
import { getSession } from "@/app/lib/utils/session";
import { createNoteSchema } from "@/app/lib/validations/note";

/**
 * GET /api/notes
 * List all notes for the authenticated user (owned + shared with them)
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

    // Base query: notes owned by user OR shared with user
    let query: Record<string, unknown> = {
      $or: [{ userId: session.userId }, { "members.userId": session.userId }],
    };

    if (category) {
      query.category = category;
    }

    // When fetching notes linked to an event, check if the user has broad
    // access to that event (calendar/event-level sharing). If so, show ALL
    // notes for that event regardless of who created them.
    if (linkedEventId) {
      const event = await Event.findById(linkedEventId).lean();
      let hasEventAccess = false;

      if (event) {
        // Event owner
        if (event.userId?.toString() === session.userId) {
          hasEventAccess = true;
        }

        // Event-level member
        if (!hasEventAccess) {
          const eventMembers =
            (event.members as Array<{
              userId: string | mongoose.Types.ObjectId;
            }>) || [];
          if (
            eventMembers.some((m) => m.userId.toString() === session.userId)
          ) {
            hasEventAccess = true;
          }
        }

        // Calendar-level member
        if (!hasEventAccess && event.calendarId) {
          const calendar = await Calendar.findById(event.calendarId).lean();
          if (calendar) {
            const isCalOwner = calendar.userId.toString() === session.userId;
            const isCalMember = calendar.members?.some(
              (m) => m.userId.toString() === session.userId
            );
            if (isCalOwner || isCalMember) {
              hasEventAccess = true;
            }
          }
        }
      }

      if (hasEventAccess) {
        // Show ALL notes for this event
        query = { linkedEventId };
      } else {
        // Show only accessible notes for this event
        query = {
          linkedEventId,
          $or: [
            { userId: session.userId },
            { "members.userId": session.userId },
          ],
        };
      }

      if (category) {
        query.category = category;
      }
    }

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedNotes = notes.map((note) => {
      const isOwner = note.userId.toString() === session.userId;
      const myMember = (note.members || []).find(
        (m: { userId: string; role: string }) => m.userId === session.userId
      );
      const myRole: "owner" | "editor" | "viewer" = isOwner
        ? "owner"
        : ((myMember?.role as "editor" | "viewer") ?? "viewer");

      return {
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
        isOwner,
        myRole,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      };
    });

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
            userId: note.userId.toString(),
            title: note.title,
            content: note.content,
            category: note.category,
            linkedEventId: note.linkedEventId?.toString(),
            members: [],
            isOwner: true,
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

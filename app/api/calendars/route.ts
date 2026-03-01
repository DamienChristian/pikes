import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Calendar from "@/app/lib/db/models/Calendar";
import User from "@/app/lib/db/models/User";
import { getSession } from "@/app/lib/utils/session";

/**
 * Helper: format a calendar document for API response, enriching members with user info
 */
async function formatCalendar(
  cal: Record<string, unknown>,
  currentUserId: string
) {
  const isOwner = (cal.userId as string) === currentUserId;
  const members = (cal.members as Array<Record<string, unknown>>) || [];

  // Look up member user info
  const memberUserIds = members.map((m) => m.userId as string);
  const memberUsers =
    memberUserIds.length > 0
      ? await User.find({ _id: { $in: memberUserIds } })
          .select("username email firstName lastName avatarUrl")
          .lean()
      : [];
  const userMap = new Map(memberUsers.map((u) => [u._id.toString(), u]));

  // Look up owner name for shared calendars
  let ownerName: string | undefined;
  if (!isOwner) {
    const owner = await User.findById(cal.userId as string)
      .select("username firstName lastName")
      .lean();
    if (owner) {
      ownerName = owner.firstName
        ? `${owner.firstName} ${owner.lastName || ""}`.trim()
        : owner.username;
    }
  }

  const currentMember = members.find(
    (m) => (m.userId as string) === currentUserId
  );

  return {
    id: (cal._id as { toString(): string }).toString(),
    userId: cal.userId as string,
    name: cal.name as string,
    color: cal.color as string,
    isVisible: cal.isVisible as boolean,
    isDefault: (cal.isDefault as boolean) || false,
    source: cal.source as string,
    sourceUrl: cal.sourceUrl as string | undefined,
    members: members.map((m) => {
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
    }),
    isPublicJoinEnabled: (cal.isPublicJoinEnabled as boolean) || false,
    defaultJoinRole: ((cal.defaultJoinRole as string) || "viewer") as
      | "viewer"
      | "editor",
    shareToken: isOwner ? (cal.shareToken as string | undefined) : undefined,
    role: isOwner ? "owner" : (currentMember?.role as string) || "viewer",
    ownerName,
    createdAt: cal.createdAt,
    updatedAt: cal.updatedAt,
  };
}

/**
 * GET /api/calendars
 * List all calendars for the authenticated user (own + shared).
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

    // Fetch own calendars
    let ownCalendars = await Calendar.find({ userId: session.userId })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    // Auto-create a default calendar if the user has none
    if (ownCalendars.length === 0) {
      const defaultCalendar = await Calendar.create({
        userId: session.userId,
        name: "Personal",
        color: "#3B82F6",
        isVisible: true,
        isDefault: true,
        source: "local",
      });

      ownCalendars = [defaultCalendar.toObject()];
    }

    // Fetch calendars shared with this user
    const sharedCalendars = await Calendar.find({
      "members.userId": session.userId,
    })
      .sort({ name: 1 })
      .lean();

    const allCalendars = [...ownCalendars, ...sharedCalendars];
    const formatted = await Promise.all(
      allCalendars.map((cal) =>
        formatCalendar(
          cal as unknown as Record<string, unknown>,
          session.userId
        )
      )
    );

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
    const {
      name,
      color,
      source,
      sourceUrl,
      isPublicJoinEnabled,
      defaultJoinRole,
    } = body;

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
      isPublicJoinEnabled: isPublicJoinEnabled || false,
      defaultJoinRole: defaultJoinRole || "viewer",
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
            members: [],
            isPublicJoinEnabled: calendar.isPublicJoinEnabled,
            defaultJoinRole: calendar.defaultJoinRole,
            shareToken: calendar.shareToken,
            role: "owner",
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

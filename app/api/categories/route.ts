import { NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import Event from "@/app/lib/db/models/Event";
import { getSession } from "@/app/lib/utils/session";

export async function GET() {
  try {
    // Verify session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get unique categories for the user's events/tasks
    const categories = await Event.distinct("category", {
      userId: session.userId,
      category: { $exists: true, $ne: "" },
    });

    return NextResponse.json({
      success: true,
      data: { categories: categories.sort() },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

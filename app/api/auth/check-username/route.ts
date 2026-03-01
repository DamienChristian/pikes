import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import { usernameSchema } from "@/app/lib/validations/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required",
        },
        { status: 400 }
      );
    }

    // Validate username format
    const result = usernameSchema.safeParse(username);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: result.error.issues[0]?.message || "Invalid username",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({
      username: result.data,
    });

    return NextResponse.json(
      {
        success: true,
        available: !existingUser,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Check username error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check username availability",
      },
      { status: 500 }
    );
  }
}

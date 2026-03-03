import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import {
  getSession,
  deleteAllUserSessions,
  createSession,
  setSessionCookie,
} from "@/app/lib/utils/session";
import { changePasswordSchema } from "@/app/lib/validations/auth";

// POST - Change password
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = changePasswordSchema.parse(body);

    await connectDB();

    // Find user with password
    const user = await User.findById(session.userId).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(
      validatedData.currentPassword
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password is incorrect",
        },
        { status: 400 }
      );
    }

    // Update password
    user.password = validatedData.newPassword;
    await user.save();

    // Invalidate all existing sessions
    await deleteAllUserSessions(user._id.toString());

    // Create new session
    const token = await createSession(user._id.toString());
    await setSessionCookie(token);

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Change password error:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details:
            "issues" in error
              ? (error as unknown as { issues: unknown }).issues
              : undefined,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to change password. Please try again.",
      },
      { status: 500 }
    );
  }
}

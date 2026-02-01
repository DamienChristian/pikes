import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import PasswordResetToken from "@/app/lib/db/models/PasswordResetToken";
import { resetPasswordSchema } from "@/app/lib/validations/auth";
import { deleteAllUserSessions } from "@/app/lib/utils/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = resetPasswordSchema.parse(body);

    await connectDB();

    // Find reset token
    const resetToken = await PasswordResetToken.findOne({
      token: validatedData.token,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired reset token",
        },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(resetToken.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Update password
    user.password = validatedData.password;
    await user.save();

    // Delete the reset token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    // Invalidate all existing sessions
    await deleteAllUserSessions(user._id.toString());

    return NextResponse.json(
      {
        success: true,
        message:
          "Password reset successful. Please login with your new password.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Reset password error:", error);

    // Handle validation errors
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ZodError" &&
      "errors" in error
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset password. Please try again.",
      },
      { status: 500 }
    );
  }
}

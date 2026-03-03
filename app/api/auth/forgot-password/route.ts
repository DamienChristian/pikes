import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import PasswordResetToken from "@/app/lib/db/models/PasswordResetToken";
import { forgotPasswordSchema } from "@/app/lib/validations/auth";
import { sendPasswordResetEmail } from "@/app/lib/services/email";
import {
  rateLimit,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/app/lib/utils/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP address
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = rateLimit(
      `password-reset:${ip}`,
      RATE_LIMITS.passwordReset
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many password reset attempts. Please try again later.",
        },
        {
          status: 429,
          headers: getRateLimitHeaders(
            rateLimitResult.remaining,
            rateLimitResult.resetTime
          ),
        }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = forgotPasswordSchema.parse(body);

    await connectDB();

    // Find user
    const user = await User.findOne({ email: validatedData.email });

    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, a password reset link will be sent.",
        },
        { status: 200 }
      );
    }

    // Delete any existing reset tokens for this user
    await PasswordResetToken.deleteOne({ userId: user._id.toString() });

    // Create reset token (valid for 1 hour)
    const resetToken = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetToken.create({
      userId: user._id.toString(),
      token: resetToken,
      expiresAt,
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.firstName, resetToken);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Continue anyway - don't reveal if email sending failed
    }
    console.log(
      `Reset URL: ${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "If an account with that email exists, a password reset link will be sent.",
        // In development, include the token (remove in production)
        ...(process.env.NODE_ENV === "development" && {
          resetToken,
          resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`,
        }),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Forgot password error:", error);

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
        error: "Failed to process request. Please try again.",
      },
      { status: 500 }
    );
  }
}

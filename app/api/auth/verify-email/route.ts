import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import { sendWelcomeEmail } from "@/app/lib/services/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid verification token",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user with this token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired verification token",
        },
        { status: 400 }
      );
    }

    // Update user - mark as verified and clear token
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue anyway - verification was successful
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify email",
      },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email }).select(
      "+emailVerificationToken +emailVerificationExpires"
    );

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json(
        {
          success: true,
          message: "If an account exists, a verification email will be sent.",
        },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is already verified",
        },
        { status: 400 }
      );
    }

    // Generate new token if needed
    const { nanoid } = await import("nanoid");
    const verificationToken = nanoid(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    const { sendVerificationEmail } = await import("@/app/lib/services/email");
    try {
      await sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send verification email",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification email sent",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to resend verification email",
      },
      { status: 500 }
    );
  }
}

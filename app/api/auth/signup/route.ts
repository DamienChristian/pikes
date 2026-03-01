import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import { signupSchema } from "@/app/lib/validations/auth";
import { createSession, setSessionCookie } from "@/app/lib/utils/session";
import { sendVerificationEmail } from "@/app/lib/services/email";
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
    const rateLimitResult = rateLimit(`signup:${ip}`, RATE_LIMITS.signup);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many signup attempts. Please try again later.",
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
    const validatedData = signupSchema.parse(body);

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email already exists",
        },
        { status: 400 }
      );
    }

    // Check if username is taken
    const existingUsername = await User.findOne({
      username: validatedData.username,
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is already taken",
        },
        { status: 400 }
      );
    }

    // Create new user
    const verificationToken = nanoid(32);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      email: validatedData.email,
      username: validatedData.username,
      password: validatedData.password,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email (non-blocking)
    try {
      await sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Continue anyway - user can request resend later
    }

    // Create session
    const token = await createSession(user._id.toString());
    await setSessionCookie(token);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
          },
        },
        message:
          "Account created successfully. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);

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
        error: "Failed to create account. Please try again.",
      },
      { status: 500 }
    );
  }
}

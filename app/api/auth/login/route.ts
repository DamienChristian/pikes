import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import { loginSchema } from "@/app/lib/validations/auth";
import { createSession, setSessionCookie } from "@/app/lib/utils/session";
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
    const rateLimitResult = rateLimit(`login:${ip}`, RATE_LIMITS.login);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again later.",
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
    const validatedData = loginSchema.parse(body);

    await connectDB();

    // Find user and include password for comparison
    const user = await User.findOne({ email: validatedData.email }).select(
      "+password"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(validatedData.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Create session
    const token = await createSession(
      user._id.toString(),
      validatedData.rememberMe
    );
    await setSessionCookie(token, validatedData.rememberMe);

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
          },
        },
        message: "Login successful",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Login error:", error);

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
        error: "Failed to login. Please try again.",
      },
      { status: 500 }
    );
  }
}

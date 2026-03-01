import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";
import { getSession } from "@/app/lib/utils/session";
import { updateProfileSchema } from "@/app/lib/validations/auth";

// GET - Get user profile
export async function GET() {
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

    await connectDB();

    const user = await User.findById(session.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

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
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get profile error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get profile. Please try again.",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
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
    const validatedData = updateProfileSchema.parse(body);

    await connectDB();

    // Update user (email changes are not allowed)
    const user = await User.findByIdAndUpdate(
      session.userId,
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

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
            avatarUrl: user.avatarUrl,
            emailVerified: user.emailVerified,
          },
        },
        message: "Profile updated successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update profile error:", error);

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
        error: "Failed to update profile. Please try again.",
      },
      { status: 500 }
    );
  }
}

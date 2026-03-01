import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getSession } from "@/app/lib/utils/session";
import connectDB from "@/app/lib/db/mongodb";
import User from "@/app/lib/db/models/User";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PIKES_BLOB_READ_WRITE_TOKEN = process.env.PIKES_BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    await connectDB();

    // Delete old avatar blob if it exists
    const existingUser = await User.findById(session.userId).select(
      "avatarUrl"
    );
    if (existingUser?.avatarUrl) {
      try {
        await del(existingUser.avatarUrl);
      } catch (deleteError) {
        // Non-critical — old blob may already be gone
        console.warn("Failed to delete old avatar blob:", deleteError);
      }
    }

    // Upload to Vercel Blob
    const extension = file.name.split(".").pop() || "jpg";
    const pathname = `avatars/user-${session.userId}-${Date.now()}.${extension}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      token: PIKES_BLOB_READ_WRITE_TOKEN,
    });

    // Update user in database
    const user = await User.findByIdAndUpdate(
      session.userId,
      { avatarUrl: blob.url },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl: blob.url,
      message: "Avatar uploaded successfully",
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.userId).select("avatarUrl");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Delete blob from Vercel Blob storage
    if (user.avatarUrl) {
      try {
        await del(user.avatarUrl, { token: PIKES_BLOB_READ_WRITE_TOKEN });
      } catch (deleteError) {
        console.warn("Failed to delete blob:", deleteError);
      }
    }

    // Clear avatarUrl in database
    await User.findByIdAndUpdate(session.userId, { $unset: { avatarUrl: 1 } });

    return NextResponse.json({
      success: true,
      message: "Profile picture removed successfully",
    });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove profile picture" },
      { status: 500 }
    );
  }
}

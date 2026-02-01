import { NextResponse } from "next/server";
import { deleteSession } from "@/app/lib/utils/session";

export async function POST() {
  try {
    await deleteSession();

    return NextResponse.json(
      {
        success: true,
        message: "Logout successful",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to logout. Please try again.",
      },
      { status: 500 }
    );
  }
}

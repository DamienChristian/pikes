import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/utils/session";

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

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: session.userId,
            email: session.email,
            firstName: session.firstName,
            lastName: session.lastName,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Session error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get session. Please try again.",
      },
      { status: 500 }
    );
  }
}

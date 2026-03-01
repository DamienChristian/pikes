import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import connectDB from "@/app/lib/db/mongodb";
import Session from "@/app/lib/db/models/Session";
import User from "@/app/lib/db/models/User";

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const EXTENDED_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Get JWT secret from environment or generate a default one for development
const getSecret = () => {
  const secret =
    process.env.JWT_SECRET ||
    "your-secret-key-min-32-chars-long-for-development";
  return new TextEncoder().encode(secret);
};

export interface SessionData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  sessionId: string;
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  rememberMe: boolean = false
): Promise<string> {
  await connectDB();

  const sessionId = nanoid();
  const duration = rememberMe ? EXTENDED_SESSION_DURATION : SESSION_DURATION;
  const expiresAt = new Date(Date.now() + duration);

  // Create JWT token
  const token = await new SignJWT({ userId, sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(getSecret());

  // Store session in database
  await Session.create({
    userId,
    token: sessionId,
    expiresAt,
  });

  return token;
}

/**
 * Verify and get session data from token
 */
export async function verifySession(
  token: string
): Promise<SessionData | null> {
  try {
    // Verify JWT
    const verified = await jwtVerify(token, getSecret());
    const payload = verified.payload as { userId: string; sessionId: string };

    await connectDB();

    // Check if session exists in database and is not expired
    const session = await Session.findOne({
      userId: payload.userId,
      token: payload.sessionId,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return null;
    }

    // Get user data
    const user = await User.findById(payload.userId).select(
      "email firstName lastName avatarUrl emailVerified"
    );

    if (!user) {
      return null;
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      sessionId: payload.sessionId,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(
  token: string,
  rememberMe: boolean = false
): Promise<void> {
  const cookieStore = await cookies();
  const duration = rememberMe ? EXTENDED_SESSION_DURATION : SESSION_DURATION;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: duration / 1000, // Convert to seconds
    path: "/",
  });
}

/**
 * Delete session (logout)
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      const verified = await jwtVerify(token, getSecret());
      const payload = verified.payload as { userId: string; sessionId: string };

      await connectDB();

      // Delete session from database
      await Session.deleteOne({
        userId: payload.userId,
        token: payload.sessionId,
      });
    } catch {
      // Token invalid, just delete cookie
    }
  }

  // Delete cookie
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await connectDB();
  await Session.deleteMany({ userId });
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await connectDB();
  await Session.deleteMany({ expiresAt: { $lt: new Date() } });
}

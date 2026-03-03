/**
 * Utility to seed the test database with known test users and data.
 *
 * Run this ONCE before your E2E suite when you need a clean database state:
 *
 *   npx tsx tests/helpers/seed-test-db.ts
 *
 * Environment variables:
 *   MONGODB_URI   - Connection string for the database to seed.
 *
 * The script is idempotent — running it multiple times is safe.
 */

import mongoose from "mongoose";
import * as bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/pikes-test";

// ---------------------------------------------------------------------------
// Minimal inline schemas so this script has no transitive deps on Next.js
// ---------------------------------------------------------------------------
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const CalendarSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    color: { type: String, default: "#3B82F6" },
    isDefault: { type: Boolean, default: false },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: { type: Array, default: [] },
    shareToken: { type: String },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Calendar =
  mongoose.models.Calendar || mongoose.model("Calendar", CalendarSchema);

// ---------------------------------------------------------------------------
// Test users definition
// ---------------------------------------------------------------------------
export const TEST_USERS = [
  {
    email: "test@example.com",
    username: "testuser",
    password: "password123",
    firstName: "Test",
    lastName: "User",
    emailVerified: true,
  },
  {
    email: "test2@example.com",
    username: "testuser2",
    password: "password123",
    firstName: "Second",
    lastName: "User",
    emailVerified: true,
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedTestDatabase() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to database:", MONGODB_URI);

  for (const userData of TEST_USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`User ${userData.email} already exists — skipping.`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await User.create({
      ...userData,
      password: hashedPassword,
    });

    // Create a default calendar for the user
    const existingCal = await Calendar.findOne({
      ownerId: user._id,
      isDefault: true,
    });
    if (!existingCal) {
      await Calendar.create({
        name: "My Calendar",
        color: "#3B82F6",
        isDefault: true,
        ownerId: user._id,
        isVisible: true,
      });
      console.log(`Created default calendar for ${userData.email}`);
    }

    console.log(`Created user: ${userData.email}`);
  }

  await mongoose.disconnect();
  console.log("Done seeding test database.");
}

// ---------------------------------------------------------------------------
// Cleanup function (run after E2E suite if needed)
// ---------------------------------------------------------------------------
export async function cleanupTestDatabase() {
  await mongoose.connect(MONGODB_URI);
  console.log("Cleaning up test database...");

  for (const userData of TEST_USERS) {
    const user = await User.findOne({ email: userData.email });
    if (user) {
      // Delete all test data for this user — extend as more collections are added
      const EventModel =
        mongoose.models.Event ||
        mongoose.model("Event", new mongoose.Schema({}, { strict: false }));
      const NoteModel =
        mongoose.models.Note ||
        mongoose.model("Note", new mongoose.Schema({}, { strict: false }));

      await EventModel.deleteMany({ userId: user._id });
      await NoteModel.deleteMany({ userId: user._id });
      await Calendar.deleteMany({ ownerId: user._id });
      await User.deleteOne({ _id: user._id });
      console.log(`Removed test user: ${userData.email}`);
    }
  }

  await mongoose.disconnect();
  console.log("Cleanup complete.");
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("seed-test-db.ts")) {
  // Check for --cleanup flag
  const isCleanup = process.argv.includes("--cleanup");
  const fn = isCleanup ? cleanupTestDatabase : seedTestDatabase;
  fn().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

import mongoose, { Schema, Model } from "mongoose";
import crypto from "crypto";

export interface ICalendarMember {
  userId: string;
  role: "viewer" | "editor";
  addedAt: Date;
}

export interface ICalendar {
  _id: string;
  userId: string;
  name: string;
  color: string;
  isVisible: boolean;
  isDefault: boolean;
  source: "local" | "imported";
  sourceUrl?: string;
  // Sharing
  members: ICalendarMember[];
  isPublicJoinEnabled: boolean;
  defaultJoinRole: "viewer" | "editor";
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarMemberSchema = new Schema<ICalendarMember>(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CalendarSchema = new Schema<ICalendar>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Calendar name is required"],
      trim: true,
      maxlength: [100, "Calendar name cannot be more than 100 characters"],
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["local", "imported"],
      default: "local",
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    members: {
      type: [CalendarMemberSchema],
      default: [],
    },
    isPublicJoinEnabled: {
      type: Boolean,
      default: false,
    },
    defaultJoinRole: {
      type: String,
      enum: ["viewer", "editor"],
      default: "viewer",
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true, // Only enforce uniqueness for documents that have this field
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
CalendarSchema.index({ userId: 1, isDefault: 1 });
CalendarSchema.index({ "members.userId": 1 });
CalendarSchema.index({ shareToken: 1 });

// Auto-generate share token when calendar is first created
CalendarSchema.pre("save", function () {
  if (!this.shareToken) {
    this.shareToken = crypto.randomBytes(24).toString("hex");
  }
});

// Delete cached model to pick up schema changes
delete mongoose.models.Calendar;

const Calendar: Model<ICalendar> =
  mongoose.models.Calendar ||
  mongoose.model<ICalendar>("Calendar", CalendarSchema);

export default Calendar;

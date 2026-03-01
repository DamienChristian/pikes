import mongoose, { Schema, Model } from "mongoose";

export interface ICalendar {
  _id: string;
  userId: string;
  name: string;
  color: string;
  isVisible: boolean;
  isDefault: boolean;
  source: "local" | "imported";
  sourceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
CalendarSchema.index({ userId: 1, isDefault: 1 });

const Calendar: Model<ICalendar> =
  mongoose.models.Calendar ||
  mongoose.model<ICalendar>("Calendar", CalendarSchema);

export default Calendar;

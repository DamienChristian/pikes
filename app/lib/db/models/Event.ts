import mongoose, { Schema, Model } from "mongoose";
import { CalendarEvent } from "@/app/types";

export interface IEvent extends Omit<CalendarEvent, "id"> {
  _id: string;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    location: {
      type: String,
      trim: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["event", "task"],
      default: "event",
    },
    deadline: {
      type: Date,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot be more than 50 characters"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom"],
    },
    recurrenceInterval: {
      type: Number,
      default: 1,
    },
    recurrenceDaysOfWeek: {
      type: [Number], // 0 = Sunday, 1 = Monday, etc.
    },
    recurrenceDayOfMonth: {
      type: Number, // For monthly: 1-31
    },
    recurrenceEndDate: {
      type: Date,
    },
    recurrenceCount: {
      type: Number, // Number of occurrences
    },
    parentEventId: {
      type: String, // For recurring instances, links to parent
    },
    originalDate: {
      type: Date, // For edited recurring instances
    },
    calendarId: {
      type: String, // Links to Calendar collection
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ userId: 1, startDate: 1 });

// Validate that endDate is after startDate
EventSchema.pre("save", function () {
  if (this.endDate < this.startDate) {
    throw new Error("End date must be after start date");
  }
});

const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

export default Event;

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

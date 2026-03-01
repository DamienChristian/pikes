import mongoose, { Schema, Document } from "mongoose";

export interface INoteMember {
  userId: string;
  role: "viewer" | "editor";
  addedAt: Date;
}

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string; // Rich text content (stored as HTML or JSON)
  category?: string;
  linkedEventId?: mongoose.Types.ObjectId; // Optional link to event/task
  members: INoteMember[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteMemberSchema = new Schema<INoteMember>(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      maxlength: [50000, "Content cannot exceed 50000 characters"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
      index: true,
    },
    linkedEventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      index: true,
    },
    members: {
      type: [NoteMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ userId: 1, category: 1 });
NoteSchema.index({ userId: 1, linkedEventId: 1 });
NoteSchema.index({ "members.userId": 1 });

// Delete cached model to pick up schema changes
delete mongoose.models.Note;

export default mongoose.model<INote>("Note", NoteSchema);

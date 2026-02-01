import mongoose, { Schema, Model } from "mongoose";

export interface IPasswordResetToken {
  _id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      ref: "User",
      index: true,
    },
    token: {
      type: String,
      required: [true, "Token is required"],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to automatically remove expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Only one active token per user
PasswordResetTokenSchema.index({ userId: 1 }, { unique: true });

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>(
    "PasswordResetToken",
    PasswordResetTokenSchema
  );

export default PasswordResetToken;

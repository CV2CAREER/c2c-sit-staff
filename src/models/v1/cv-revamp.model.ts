import mongoose, { Schema, Document } from "mongoose";

export interface ICvRevamp extends Document {
  sourceFile: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fullName: string;
  url: string;
  status: "pending" | "approved" | "declined";
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cvRevampSchema = new Schema<ICvRevamp>(
  {
    sourceFile: {
      type: Schema.Types.ObjectId,
      ref: "upload",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
    },
    fileName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const CvRevamp =
  mongoose.models?.CvRevamp || mongoose.model<ICvRevamp>("CvRevamp", cvRevampSchema);

export default CvRevamp;

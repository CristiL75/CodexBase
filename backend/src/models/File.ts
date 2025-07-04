import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
  repository: mongoose.Types.ObjectId;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: mongoose.Types.ObjectId;
}

const FileSchema = new Schema<IFile>({
  repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  branch: { type: String, default: "main" },
  name: { type: String, required: true },
  content: { type: String, default: "" },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const File = mongoose.model<IFile>("File", FileSchema);
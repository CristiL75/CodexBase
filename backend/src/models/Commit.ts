import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ICommit extends Document {
  repository: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  message: string;
  files: Array<{
    name: string;
    content: string;
  }>;
  hash: string;
  createdAt: Date;
}

const CommitSchema = new Schema<ICommit>({
  repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  files: [
    {
      name: String,
      content: String,
    },
  ],
  hash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// Generează hash înainte de salvare
CommitSchema.pre("validate", function (next) {
  if (!this.hash) {
    const data = this.repository + this.author + this.message + JSON.stringify(this.files) + Date.now();
    this.hash = crypto.createHash("sha1").update(data).digest("hex");
  }
  next();
});

export const Commit = mongoose.models.Commit || mongoose.model<ICommit>("Commit", CommitSchema);
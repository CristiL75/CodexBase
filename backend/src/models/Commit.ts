import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ICommit extends Document {
  repository: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  message: string;
  files: {
    name: string;
    content: string;
    path: string;
  }[];
  hash: string;
  branch: string;
  createdAt: Date;
}

const commitSchema = new Schema<ICommit>({
  repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  files: [{
    name: { type: String, required: true },
    content: { type: String, required: true },
    path: { type: String, required: true }
  }],
  hash: { type: String, unique: true },
  branch: { type: String, default: "main" },
  createdAt: { type: Date, default: Date.now }
});

commitSchema.pre<ICommit>("save", function(next) {
  if (!this.hash) {
    const data = this.repository.toString() + this.author.toString() + this.message + JSON.stringify(this.files) + Date.now();
    this.hash = crypto.createHash("sha1").update(data).digest("hex");
  }
  next();
});

export const Commit = mongoose.model<ICommit>("Commit", commitSchema);
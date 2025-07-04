// models/PullRequest.ts
import mongoose, { Schema } from "mongoose";
const PullRequestSchema = new Schema({
  repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  sourceBranch: { type: String, required: true },
  targetBranch: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ["open", "closed", "merged"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});
export const PullRequest = mongoose.models.PullRequest || mongoose.model("PullRequest", PullRequestSchema);
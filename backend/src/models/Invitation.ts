import mongoose, { Schema, Document } from "mongoose";

export interface IInvitation extends Document {
  user: mongoose.Types.ObjectId;
  repository: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

// Fix pentru ts-node-dev/hot-reload:
export const Invitation = mongoose.models.Invitation || mongoose.model<IInvitation>("Invitation", InvitationSchema);
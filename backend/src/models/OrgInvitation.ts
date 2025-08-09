import mongoose, { Schema, Document } from "mongoose";

export interface IOrgInvitation extends Document {
  user: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
}

const OrgInvitationSchema = new Schema<IOrgInvitation>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  organization: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

// Fix pentru ts-node-dev/hot-reload:
export const OrgInvitation = mongoose.models.OrgInvitation || mongoose.model<IOrgInvitation>("OrgInvitation", OrgInvitationSchema);
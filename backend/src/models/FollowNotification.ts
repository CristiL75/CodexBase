import mongoose from "mongoose";

const FollowNotificationSchema = new mongoose.Schema({
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  read: { type: Boolean, default: false },
  type: { type: String, default: "follow" },
  createdAt: { type: Date, default: Date.now }
});

// Fix pentru hot-reload/development:
export const FollowNotification = mongoose.models.FollowNotification || mongoose.model("FollowNotification", FollowNotificationSchema);
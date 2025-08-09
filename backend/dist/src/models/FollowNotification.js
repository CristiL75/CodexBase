"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowNotification = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FollowNotificationSchema = new mongoose_1.default.Schema({
    to: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    read: { type: Boolean, default: false },
    type: { type: String, default: "follow" },
    createdAt: { type: Date, default: Date.now }
});
// Fix pentru hot-reload/development:
exports.FollowNotification = mongoose_1.default.models.FollowNotification || mongoose_1.default.model("FollowNotification", FollowNotificationSchema);

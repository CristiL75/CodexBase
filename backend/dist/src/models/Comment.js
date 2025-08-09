"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CommentSchema = new mongoose_1.default.Schema({
    prId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "PullRequest", required: true },
    author: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
exports.default = mongoose_1.default.model("Comment", CommentSchema);

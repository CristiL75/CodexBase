"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const OrganizationSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    owner: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }],
    repositories: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Repository" }], // <-- adaugă asta
    createdAt: { type: Date, default: Date.now }
});
exports.default = mongoose_1.default.model("Organization", OrganizationSchema);

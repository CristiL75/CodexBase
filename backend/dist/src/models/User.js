"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    avatar: { type: String },
    passwordHash: { type: String },
    authMethod: { type: String, enum: ["google", "local"], required: true },
    jwtToken: { type: String },
    refreshToken: { type: String },
    refreshTokenExpiresAt: { type: Date },
    is2FAEnabled: { type: Boolean, default: false },
    twoFASecret: { type: String },
    commits: { type: Number, default: 0 },
    repositories: { type: Number, default: 0 },
    lastCommitAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    // Extinderi
    roles: { type: [String], default: ["user"] },
    bio: { type: String, maxlength: 500 },
    starredRepositories: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Repository" }],
    followers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    dailyCommitLimit: { type: Number, default: 1000 },
    isActive: { type: Boolean, default: true },
    // Backup codes hashed for 2FA recovery
    backupCodes: [{ type: String }],
});
exports.User = mongoose_1.default.model("User", UserSchema);

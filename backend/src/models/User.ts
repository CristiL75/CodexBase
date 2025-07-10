import mongoose, { Document, Schema } from "mongoose";
import crypto from "crypto";

export interface IUser extends Document {
  googleId?: string;
  email: string;
  name: string;
  avatar?: string;
  jwtToken?: string;

  passwordHash?: string;
  authMethod: "google" | "local";

  is2FAEnabled: boolean;
  twoFASecret?: string;

  commits: number;
  repositories: number;
  lastCommitAt?: Date;
  createdAt: Date;

  // Extindere:
  roles: string[];           // roluri user (ex: ["user", "admin"])
  bio?: string;              // descriere user
  starredRepositories: mongoose.Types.ObjectId[];  // repo favorite
  followers: mongoose.Types.ObjectId[];            // useri ce-l urmaresc
  following: mongoose.Types.ObjectId[];            // useri urmăriți

  dailyCommitLimit: number;  // ex: 100 commits pe zi (sau nelimitat)
  isActive: boolean;         // dacă userul e activ, ex. blocat sau nu

  // 2FA backup codes (hashed)
  backupCodes?: string[];
}

const UserSchema = new Schema<IUser>({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  avatar: { type: String },

  passwordHash: { type: String },
  authMethod: { type: String, enum: ["google", "local"], required: true },

  jwtToken: { type: String },

  is2FAEnabled: { type: Boolean, default: false },
  twoFASecret: { type: String },

  commits: { type: Number, default: 0 },
  repositories: { type: Number, default: 0 },
  lastCommitAt: { type: Date },

  createdAt: { type: Date, default: Date.now },

  // Extinderi
  roles: { type: [String], default: ["user"] },
  bio: { type: String, maxlength: 500 },

  starredRepositories: [{ type: Schema.Types.ObjectId, ref: "Repository" }],
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],

  dailyCommitLimit: { type: Number, default: 1000 },
  isActive: { type: Boolean, default: true },

  // Backup codes hashed for 2FA recovery
  backupCodes: [{ type: String }],
});


export const User = mongoose.model<IUser>("User", UserSchema);

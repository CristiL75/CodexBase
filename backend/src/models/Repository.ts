import mongoose, { Schema, Document } from "mongoose";

export interface IRepository extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId; // creatorul repo-ului
  collaborators: mongoose.Types.ObjectId[]; // membrii repo-ului
  isPrivate: boolean;
  starredBy: mongoose.Types.ObjectId[]; // userii care au dat stea
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>({
  name: { type: String, required: true },
  description: String,
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }], // membrii
  isPrivate: { type: Boolean, default: false },
  starredBy: [{ type: Schema.Types.ObjectId, ref: "User" }], // stele
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Repository = mongoose.model<IRepository>("Repository", RepositorySchema);
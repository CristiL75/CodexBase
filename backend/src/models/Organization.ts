import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  repositories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Repository" }], // <-- adaugă asta
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Organization", OrganizationSchema);
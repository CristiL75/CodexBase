import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Importă strategia Google Passport pentru a evita eroarea "Unknown authentication strategy 'google'"
import "./auth/google";
import userRoutes from "./routes/user";
import authRoutes from "./routes/auth";
import repositoryRoutes from "./routes/repository"; // <-- importă ruta pentru repository
import invitationRoutes from './routes/invitation';
import organizationRoutes from "./routes/organization";
import orgInvitationRoutes from "./routes/org-invitation";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/repository", repositoryRoutes); 
app.use('/invitation', invitationRoutes);
app.use("/organization", organizationRoutes);
app.use("/org-invitation", orgInvitationRoutes);
// <-- adaugă ruta pentru repository

app.get("/", (_, res) => {
  res.send("🔐 CodexBase backend running");
});

mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
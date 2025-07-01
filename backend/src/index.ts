import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Importă strategia Google Passport pentru a evita eroarea "Unknown authentication strategy 'google'"
import "./auth/google";

import authRoutes from "./routes/auth";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Mount auth routes under /auth
app.use("/auth", authRoutes);

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
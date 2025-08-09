import app from './app';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    const server = app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server on http://localhost:${process.env.PORT || 5000}`);
    });
    
    // Configure server to handle large payloads
    server.timeout = 300000; // 5 minutes
    server.maxHeadersCount = 0;
    server.requestTimeout = 300000;
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
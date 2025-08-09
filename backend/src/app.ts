import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Google auth strategy
import './auth/google';

// Import routes
import authRoutes from './routes/auth';
import repositoryRoutes from './routes/repository';
import invitationRoutes from './routes/invitation';
import organizationRoutes from './routes/organization';
import orgInvitationRoutes from './routes/org-invitation';
import userRoutes from './routes/user';

dotenv.config();

const app = express();

// Configure Express with MAXIMUM limits FIRST - before any other middleware
app.use(express.json({ 
  limit: '200mb',
  verify: (req, res, buf) => {
    console.log(`🔧 [EXPRESS] JSON body received: ${buf.length} bytes`);
  }
}));
app.use(express.urlencoded({ 
  limit: '200mb', 
  extended: true,
  parameterLimit: 50000
}));

// Add CORS after body parsing
app.use(cors());

// Log ALL requests - this should show every request
app.use((req, res, next) => {
  console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log(`🌐 Content-Type: ${req.headers['content-type']}`);
  console.log(`🌐 Content-Length: ${req.headers['content-length']}`);
  console.log(`🌐 Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  
  if (req.path.includes('/commit')) {
    console.log(`🔧 [REQUEST] ⚠️ COMMIT REQUEST DETECTED! ⚠️`);
    console.log(`🔧 [REQUEST] Full path: ${req.path}`);
    console.log(`🔧 [REQUEST] Method: ${req.method}`);
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/repository', repositoryRoutes);
app.use('/invitation', invitationRoutes);
app.use('/organization', organizationRoutes);
app.use('/org-invitation', orgInvitationRoutes);
app.use('/user', userRoutes);

// Error handling middleware for payload too large
app.use((error: any, req: any, res: any, next: any) => {
  if (error.type === 'entity.too.large') {
    console.error('🔧 [ERROR] Payload too large:', error.message);
    console.error('🔧 [ERROR] Request details:', {
      method: req.method,
      path: req.path,
      contentLength: req.headers['content-length'],
      contentType: req.headers['content-type']
    });
    return res.status(413).json({
      message: 'Payload too large. Maximum allowed size is 200MB.',
      limit: '200MB',
      received: req.headers['content-length'] || 'unknown'
    });
  }
  next(error);
});

// Health check
app.get('/', (req, res) => {
  res.send("🔐 CodexBase backend running");
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get("/test", (_, res) => {
  res.json({ status: "OK", message: "Backend is working" });
});

// Test endpoint for large payloads
app.post("/test-upload", (req, res) => {
  console.log('🔧 [TEST] Upload test endpoint called');
  console.log('🔧 [TEST] Body size:', JSON.stringify(req.body).length);
  console.log('🔧 [TEST] Content-Length:', req.headers['content-length']);
  res.json({ 
    status: "OK", 
    message: "Large payload test successful",
    bodySize: JSON.stringify(req.body).length,
    contentLength: req.headers['content-length']
  });
});

// Emergency fix for user counters - temporary endpoint
app.get("/fix-user-counters/:userId", async (req, res) => {
  try {
    const { User } = require('./models/User');
    const { Repository } = require('./models/Repository');
    const { Commit } = require('./models/Commit');
    
    const userId = req.params.userId;
    console.log(`🔧 [EMERGENCY-FIX] Fixing counters for user: ${userId}`);
    
    const repoCount = await Repository.countDocuments({ owner: userId });
    const commitCount = await Commit.countDocuments({ author: userId });
    
    const result = await User.findByIdAndUpdate(userId, {
      repositories: repoCount,
      commits: commitCount
    }, { new: true });
    
    console.log(`🔧 [EMERGENCY-FIX] Updated user: repos=${repoCount}, commits=${commitCount}`);
    
    res.json({
      message: "User counters fixed!",
      userId: userId,
      repositories: result?.repositories,
      commits: result?.commits
    });
  } catch (error: any) {
    console.error('🔧 [EMERGENCY-FIX] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
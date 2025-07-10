import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import repositoryRoutes from './routes/repository';
import invitationRoutes from './routes/invitation';
import organizationRoutes from './routes/organization';
import orgInvitationRoutes from './routes/org-invitation';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/invitation', invitationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/org-invitation', orgInvitationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;
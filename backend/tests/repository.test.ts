import request from 'supertest';
import app from '../src/app';
import { User } from '../src/models/User';
import { Repository } from '../src/models/Repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Repository API', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user with authMethod
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      authMethod: 'local', // Add this required field
    });
    userId = (user._id as any).toString();

    // Generate JWT token
    token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});
  }, 30000);

  beforeEach(async () => {
    await Repository.deleteMany({});
  });

  describe('POST /api/repository/new', () => {
    it('should not allow unauthenticated user to create repo', async () => {
      const response = await request(app)
        .post('/api/repository/new')
        .send({
          name: 'Test Repo',
          description: 'Test Description',
          isPrivate: false,
        });

      expect(response.status).toBe(401);
    });

    it('should create a repo for authenticated user', async () => {
      const response = await request(app)
        .post('/api/repository/new')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Repo',
          description: 'Test Description',
          isPrivate: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Repo');
      expect(response.body.owner).toBe(userId);
    });

    it('should require name field', async () => {
      const response = await request(app)
        .post('/api/repository/new')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Test Description',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/repository/my', () => {
    it('should return user repositories', async () => {
      // Create a test repository
      await Repository.create({
        name: 'My Test Repo',
        description: 'My Test Description',
        owner: userId,
        collaborators: [userId],
        isPrivate: false,
      });

      const response = await request(app)
        .get('/api/repository/my')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('My Test Repo');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/repository/my');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/repository/star/:id', () => {
    let repoId: string;

    beforeEach(async () => {
      const repo = await Repository.create({
        name: 'Repo to Star',
        description: 'Description',
        owner: userId,
        collaborators: [userId],
        isPrivate: false,
        starredBy: [],
      });
      repoId = (repo._id as any).toString();
    });

    it('should star a repository', async () => {
      const response = await request(app)
        .post(`/api/repository/star/${repoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.starred).toBe(true);
      expect(response.body.stars).toBe(1);
    });

    it('should unstar a repository when starred again', async () => {
      // First star the repo
      await request(app)
        .post(`/api/repository/star/${repoId}`)
        .set('Authorization', `Bearer ${token}`);

      // Then unstar it
      const response = await request(app)
        .post(`/api/repository/star/${repoId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.starred).toBe(false);
      expect(response.body.stars).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/repository/star/${repoId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent repository', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but non-existent

      const response = await request(app)
        .post(`/api/repository/star/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Repository not found');
    });
  });

  describe('GET /api/repository/public', () => {
    it('should return public repositories', async () => {
      // Create public and private repos
      await Repository.create({
        name: 'Public Repo',
        description: 'Public Description',
        owner: userId,
        isPrivate: false,
        starredBy: [],
      });

      await Repository.create({
        name: 'Private Repo',
        description: 'Private Description',
        owner: userId,
        isPrivate: true,
        starredBy: [],
      });

      const response = await request(app)
        .get('/api/repository/public');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Public Repo');
      expect(response.body[0].isPrivate).toBe(false);
    });
  });
});
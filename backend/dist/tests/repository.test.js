"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const User_1 = require("../src/models/User");
const Repository_1 = require("../src/models/Repository");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('Repository API', () => {
    let token;
    let userId;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Create test user with authMethod
        const hashedPassword = yield bcryptjs_1.default.hash('testpassword', 10);
        const user = yield User_1.User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: hashedPassword,
            authMethod: 'local', // Add this required field
        });
        userId = user._id.toString();
        // Generate JWT token
        token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
    }), 30000);
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield User_1.User.deleteMany({});
        yield Repository_1.Repository.deleteMany({});
    }), 30000);
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield Repository_1.Repository.deleteMany({});
    }));
    describe('POST /api/repository/new', () => {
        it('should not allow unauthenticated user to create repo', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .post('/api/repository/new')
                .send({
                name: 'Test Repo',
                description: 'Test Description',
                isPrivate: false,
            });
            expect(response.status).toBe(401);
        }));
        it('should create a repo for authenticated user', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
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
        }));
        it('should require name field', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .post('/api/repository/new')
                .set('Authorization', `Bearer ${token}`)
                .send({
                description: 'Test Description',
            });
            expect(response.status).toBe(400);
            expect(response.body.errors).toBeDefined();
        }));
    });
    describe('GET /api/repository/my', () => {
        it('should return user repositories', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create a test repository
            yield Repository_1.Repository.create({
                name: 'My Test Repo',
                description: 'My Test Description',
                owner: userId,
                collaborators: [userId],
                isPrivate: false,
            });
            const response = yield (0, supertest_1.default)(app_1.default)
                .get('/api/repository/my')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('My Test Repo');
        }));
        it('should require authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .get('/api/repository/my');
            expect(response.status).toBe(401);
        }));
    });
    describe('POST /api/repository/star/:id', () => {
        let repoId;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            const repo = yield Repository_1.Repository.create({
                name: 'Repo to Star',
                description: 'Description',
                owner: userId,
                collaborators: [userId],
                isPrivate: false,
                starredBy: [],
            });
            repoId = repo._id.toString();
        }));
        it('should star a repository', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .post(`/api/repository/star/${repoId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body.starred).toBe(true);
            expect(response.body.stars).toBe(1);
        }));
        it('should unstar a repository when starred again', () => __awaiter(void 0, void 0, void 0, function* () {
            // First star the repo
            yield (0, supertest_1.default)(app_1.default)
                .post(`/api/repository/star/${repoId}`)
                .set('Authorization', `Bearer ${token}`);
            // Then unstar it
            const response = yield (0, supertest_1.default)(app_1.default)
                .post(`/api/repository/star/${repoId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body.starred).toBe(false);
            expect(response.body.stars).toBe(0);
        }));
        it('should require authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app_1.default)
                .post(`/api/repository/star/${repoId}`);
            expect(response.status).toBe(401);
        }));
        it('should return 404 for non-existent repository', () => __awaiter(void 0, void 0, void 0, function* () {
            const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but non-existent
            const response = yield (0, supertest_1.default)(app_1.default)
                .post(`/api/repository/star/${fakeId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Repository not found');
        }));
    });
    describe('GET /api/repository/public', () => {
        it('should return public repositories', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create public and private repos
            yield Repository_1.Repository.create({
                name: 'Public Repo',
                description: 'Public Description',
                owner: userId,
                isPrivate: false,
                starredBy: [],
            });
            yield Repository_1.Repository.create({
                name: 'Private Repo',
                description: 'Private Description',
                owner: userId,
                isPrivate: true,
                starredBy: [],
            });
            const response = yield (0, supertest_1.default)(app_1.default)
                .get('/api/repository/public');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Public Repo');
            expect(response.body[0].isPrivate).toBe(false);
        }));
    });
});

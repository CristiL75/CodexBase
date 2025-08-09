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
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_1 = require("./auth");
const Repository_1 = require("../models/Repository");
const User_1 = require("../models/User");
const File_1 = require("../models/File");
const Commit_1 = require("../models/Commit");
const PullRequest_1 = require("../models/PullRequest");
const detectLanguageStats_1 = require("../utils/detectLanguageStats");
const Comment_1 = __importDefault(require("../models/Comment"));
const mongoose_1 = __importDefault(require("mongoose"));
const axios_1 = __importDefault(require("axios"));
const uriSanitizer_1 = require("../utils/uriSanitizer");
const router = express_1.default.Router();
// Aplicăm middleware-ul de sanitizare pentru toate rutele
router.use((0, uriSanitizer_1.createSanitizationMiddleware)());
// Helper function to get user ID
function getUserId(req) {
    var _a, _b;
    const user = req.user;
    return ((_a = user === null || user === void 0 ? void 0 : user._id) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = user === null || user === void 0 ? void 0 : user.id) === null || _b === void 0 ? void 0 : _b.toString());
}
// Helper pentru verificare colaborator/owner
function isUserCollaborator(repo, req) {
    var _a, _b, _c, _d, _e;
    const userId = getUserId(req);
    if (!userId)
        return false;
    const ownerId = ((_c = (_b = (_a = repo.owner) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString) === null || _c === void 0 ? void 0 : _c.call(_b)) || ((_e = (_d = repo.owner) === null || _d === void 0 ? void 0 : _d.toString) === null || _e === void 0 ? void 0 : _e.call(_d)) || repo.owner;
    return (ownerId === userId ||
        (repo.collaborators || []).some((c) => { var _a, _b, _c; return (((_b = (_a = c === null || c === void 0 ? void 0 : c._id) === null || _a === void 0 ? void 0 : _a.toString) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = c === null || c === void 0 ? void 0 : c.toString) === null || _c === void 0 ? void 0 : _c.call(c)) || c) === userId; }));
}
// Helper to add star info
function addStarInfo(repo, userId) {
    const repoObj = repo.toObject ? repo.toObject() : Object.assign({}, repo);
    repoObj.isStarred = userId && Array.isArray(repoObj.starredBy)
        ? repoObj.starredBy.some((id) => id.toString() === userId)
        : false;
    repoObj.stars = Array.isArray(repoObj.starredBy) ? repoObj.starredBy.length : 0;
    delete repoObj.starredBy;
    return repoObj;
}
// 🎯 RUTELE SPECIFICE TREBUIE SĂ FIE PRIMELE (ÎNAINTE DE /:repoId)
// Rută pentru repository-uri publice
router.get("/public", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[RepoView] Fetching public repositories');
        const repos = yield Repository_1.Repository.find({ isPrivate: false })
            .populate("owner", "name email avatar")
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        const reposWithStars = repos.map(repo => addStarInfo(repo));
        res.json(reposWithStars);
    }
    catch (error) {
        console.error('[RepoView] Error fetching public repos:', error);
        res.status(500).json({ message: "Server error" });
    }
}));
// Rută pentru utilizatori populari (nu repository-uri populare)
router.get('/popular', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[RepoView] Fetching popular users');
        const users = yield User_1.User.find({})
            .sort({ followers: -1 })
            .limit(12)
            .select('_id name email avatar followers')
            .lean();
        for (const user of users) {
            user.repositories = yield Repository_1.Repository.countDocuments({ owner: user._id });
        }
        res.json(users);
    }
    catch (error) {
        console.error('[RepoView] Error fetching popular users:', error);
        res.status(500).json({ message: "Server error" });
    }
}));
// Listare repo-uri ale userului (owner sau colaborator)
router.get("/my", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const repos = yield Repository_1.Repository.find({
            $or: [
                { owner: userId },
                { collaborators: userId }
            ]
        })
            .populate("owner", "name email avatar")
            .populate("collaborators", "name email avatar")
            .lean();
        const reposWithStars = repos.map(repo => addStarInfo(repo, userId));
        res.json(reposWithStars);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get("/repositories", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const repos = yield Repository_1.Repository.find({
            $or: [
                { owner: userId },
                { collaborators: userId }
            ]
        });
        res.json(repos);
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get("/activity/recent", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const user = yield User_1.User.findById(userId).select("following");
        const followingIds = (user === null || user === void 0 ? void 0 : user.following) ? [...user.following, userId] : [userId];
        const repos = yield Repository_1.Repository.find({ owner: { $in: followingIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("owner", "email name");
        const starred = yield Repository_1.Repository.find({ "starredBy": { $in: followingIds } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate("owner", "email name")
            .populate("starredBy", "email name");
        const prs = yield PullRequest_1.PullRequest.find({ author: { $in: followingIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("author", "email name")
            .populate("repository", "name");
        const commits = yield Commit_1.Commit.find({ author: { $in: followingIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("author", "email name")
            .populate("repository", "name");
        res.json({
            repos,
            starred,
            prs,
            commits,
        });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Creează un repository nou
router.post("/new", auth_1.authenticateJWT, [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("description").optional().isString(),
    (0, express_validator_1.body)("isPrivate").optional().isBoolean(),
    (0, express_validator_1.body)("collaborators").optional().isArray(),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const { name, description, isPrivate, collaborators } = req.body;
        // Verifică și avertizează despre date sensibile detectate
        const detectedPatterns = [];
        if (name) {
            const namePatterns = (0, uriSanitizer_1.getDetectedPatterns)(name);
            detectedPatterns.push(...namePatterns.map(p => `name: ${p}`));
        }
        if (description) {
            const descPatterns = (0, uriSanitizer_1.getDetectedPatterns)(description);
            detectedPatterns.push(...descPatterns.map(p => `description: ${p}`));
        }
        // Sanitizează datele (mascarea se face automat prin modelul Mongoose)
        const sanitizedData = (0, uriSanitizer_1.sanitizeRepositoryData)({ name, description, isPrivate, collaborators });
        const allCollaborators = sanitizedData.collaborators && sanitizedData.collaborators.length
            ? [...new Set([userId, ...sanitizedData.collaborators])]
            : [userId];
        const repo = yield Repository_1.Repository.create({
            name: sanitizedData.name,
            description: sanitizedData.description,
            isPrivate: (_a = sanitizedData.isPrivate) !== null && _a !== void 0 ? _a : false,
            owner: userId,
            collaborators: allCollaborators,
        });
        // Returnează răspuns cu avertisment dacă au fost detectate date sensibile
        if (detectedPatterns.length > 0) {
            res.status(201).json(Object.assign(Object.assign({}, repo.toObject()), { securityWarning: `Sensitive data detected and masked: ${detectedPatterns.join(', ')}`, detectedPatterns }));
        }
        else {
            res.status(201).json(repo);
        }
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Marchează/demarchează stea pe repo
router.post("/star/:id", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const repo = yield Repository_1.Repository.findById(req.params.id);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!repo.starredBy) {
            repo.starredBy = [];
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const hasStar = repo.starredBy.some((id) => id.toString() === userId);
        if (hasStar) {
            repo.starredBy = repo.starredBy.filter((id) => id.toString() !== userId);
        }
        else {
            repo.starredBy.push(userObjectId);
        }
        yield repo.save();
        res.json({ starred: !hasStar, stars: repo.starredBy.length });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Pull request routes - TOATE RUTELE CU /:repoId LA ÎNCEPUT
// Adaugă fișier nou (doar colaboratori/owner)
router.post("/:repoId/files", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const { name, content } = req.body;
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to modify this repository" });
            return;
        }
        // Verifică și avertizează despre date sensibile detectate
        const detectedPatterns = [];
        if (name) {
            const namePatterns = (0, uriSanitizer_1.getDetectedPatterns)(name);
            detectedPatterns.push(...namePatterns.map(p => `filename: ${p}`));
        }
        if (content) {
            const contentPatterns = (0, uriSanitizer_1.getDetectedPatterns)(content);
            detectedPatterns.push(...contentPatterns.map(p => `content: ${p}`));
        }
        const file = yield File_1.File.create({
            repository: repoId,
            name,
            content,
            author: userId,
        });
        // Returnează răspuns cu avertisment dacă au fost detectate date sensibile
        if (detectedPatterns.length > 0) {
            res.status(201).json(Object.assign(Object.assign({}, file.toObject()), { securityWarning: `Sensitive data detected and masked: ${detectedPatterns.join(', ')}`, detectedPatterns }));
        }
        else {
            res.status(201).json(file);
        }
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Listare fișiere dintr-un repository (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId/files", auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const branch = req.query.branch || "main";
        const repo = yield Repository_1.Repository.findById(repoId).lean();
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        const isCollaborator = isUserCollaborator(repo, req);
        if (repo.isPrivate && !isCollaborator) {
            res.status(403).json({ message: "You do not have access to this repository" });
            return;
        }
        let files = [];
        if (isCollaborator) {
            files = yield File_1.File.find({ repository: repoId, branch })
                .select("name author createdAt content")
                .lean();
        }
        else {
            files = yield File_1.File.find({ repository: repoId, branch })
                .limit(20)
                .select("name author createdAt content")
                .lean();
        }
        res.json(files);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Commit pe branch (doar colaboratori/owner)
router.post("/:repoId/commit", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const { message, files, branch = "main" } = req.body;
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to modify this repository" });
            return;
        }
        // Verifică și avertizează despre date sensibile în fișiere
        const detectedPatterns = [];
        if (Array.isArray(files)) {
            files.forEach((file, index) => {
                if (file.name) {
                    const namePatterns = (0, uriSanitizer_1.getDetectedPatterns)(file.name);
                    detectedPatterns.push(...namePatterns.map(p => `file[${index}].name: ${p}`));
                }
                if (file.content) {
                    const contentPatterns = (0, uriSanitizer_1.getDetectedPatterns)(file.content);
                    detectedPatterns.push(...contentPatterns.map(p => `file[${index}].content: ${p}`));
                }
            });
        }
        for (const file of files) {
            yield File_1.File.findOneAndUpdate({ repository: repoId, name: file.name, branch }, {
                $set: {
                    content: file.content,
                    author: userId,
                },
            }, { upsert: true, new: true });
        }
        const commit = yield Commit_1.Commit.create({
            repository: repoId,
            branch,
            author: userId,
            message,
            files,
        });
        // Returnează răspuns cu avertisment dacă au fost detectate date sensibile
        if (detectedPatterns.length > 0) {
            res.status(201).json(Object.assign(Object.assign({}, commit.toObject()), { securityWarning: `Sensitive data detected and masked: ${detectedPatterns.join(', ')}`, detectedPatterns }));
        }
        else {
            res.status(201).json(commit);
        }
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Listare commits (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId/commits", auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId).lean();
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        const isCollaborator = isUserCollaborator(repo, req);
        if (repo.isPrivate && !isCollaborator) {
            res.status(403).json({ message: "You do not have access to this repository" });
            return;
        }
        const commits = yield Commit_1.Commit.find({ repository: repoId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('author', 'name email');
        res.json(commits);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Clone repo (doar colaboratori/owner)
router.get("/:repoId/clone", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to clone this repository" });
            return;
        }
        const files = yield File_1.File.find({ repository: repoId });
        const commits = yield Commit_1.Commit.find({ repository: repoId }).sort({ createdAt: 1 });
        res.json({ files, commits });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Pull (doar colaboratori/owner)
router.get("/:repoId/pull", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const sinceHash = req.query.since;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to pull this repository" });
            return;
        }
        let commits;
        if (sinceHash) {
            const sinceCommit = yield Commit_1.Commit.findOne({ repository: repoId, hash: sinceHash });
            if (!sinceCommit) {
                res.status(404).json({ message: "Commit not found" });
                return;
            }
            commits = yield Commit_1.Commit.find({
                repository: repoId,
                createdAt: { $gt: sinceCommit.createdAt }
            }).sort({ createdAt: 1 });
        }
        else {
            commits = yield Commit_1.Commit.find({ repository: repoId }).sort({ createdAt: 1 });
        }
        const files = yield File_1.File.find({ repository: repoId });
        res.json({ commits, files });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Pull request routes (doar colaboratori/owner)
router.post("/:repoId/pull-request", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const { sourceBranch, targetBranch, title, description } = req.body;
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to create pull requests" });
            return;
        }
        const sourceFiles = yield File_1.File.find({ repository: repoId, branch: sourceBranch }).lean();
        const targetFiles = yield File_1.File.find({ repository: repoId, branch: targetBranch }).lean();
        const targetMap = new Map(targetFiles.map(f => [f.name, f.content]));
        let diff = '';
        for (const file of sourceFiles) {
            const targetContent = targetMap.get(file.name);
            if (targetContent === undefined) {
                diff += `\n--- New file: ${file.name} ---\n${file.content}\n`;
            }
            else if (file.content !== targetContent) {
                diff += `\n--- Modified file: ${file.name} ---\n`;
                diff += `--- Old content ---\n${targetContent}\n`;
                diff += `--- New content ---\n${file.content}\n`;
            }
        }
        const sourceNames = new Set(sourceFiles.map(f => f.name));
        for (const file of targetFiles) {
            if (!sourceNames.has(file.name)) {
                diff += `\n--- Deleted file: ${file.name} ---\n${file.content}\n`;
            }
        }
        const pr = yield PullRequest_1.PullRequest.create({
            repository: repoId,
            sourceBranch,
            targetBranch,
            author: userId,
            title,
            description,
            diff,
        });
        res.status(201).json(pr);
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.post("/pull-request/:prId/merge", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const pr = yield PullRequest_1.PullRequest.findById(req.params.prId);
        if (!pr || pr.status !== "open") {
            res.status(404).json({ message: "PR not found or already closed" });
            return;
        }
        const repo = yield Repository_1.Repository.findById(pr.repository);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req) || repo.owner.toString() !== userId) {
            res.status(403).json({ message: "Only the owner can merge this pull request" });
            return;
        }
        const files = yield File_1.File.find({ repository: pr.repository, branch: pr.sourceBranch });
        for (const file of files) {
            yield File_1.File.findOneAndUpdate({ repository: pr.repository, name: file.name, branch: pr.targetBranch }, {
                $set: {
                    content: file.content,
                    author: file.author,
                },
            }, { upsert: true, new: true });
        }
        pr.status = "merged";
        yield pr.save();
        res.json({ message: "Pull request merged" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get("/:repoId/pull-requests", auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId).lean();
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        const isCollaborator = isUserCollaborator(repo, req);
        if (repo.isPrivate && !isCollaborator) {
            res.status(403).json({ message: "You do not have access to this repository" });
            return;
        }
        const prs = yield PullRequest_1.PullRequest.find({ repository: repoId }).sort({ createdAt: -1 });
        res.json(prs);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.post("/:repoId/branch", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchName, fromBranch } = req.body;
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to create branches" });
            return;
        }
        if (fromBranch && fromBranch.trim() !== "") {
            const files = yield File_1.File.find({ repository: repoId, branch: fromBranch });
            for (const file of files) {
                yield File_1.File.create({
                    repository: repoId,
                    branch: branchName,
                    name: file.name,
                    content: file.content,
                    author: file.author,
                });
            }
        }
        res.status(201).json({ message: "Branch created" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.post("/pull-request/:prId/close", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const pr = yield PullRequest_1.PullRequest.findById(req.params.prId);
        if (!pr || pr.status !== "open") {
            res.status(404).json({ message: "PR not found or already closed" });
            return;
        }
        const repo = yield Repository_1.Repository.findById(pr.repository);
        if (!repo || !isUserCollaborator(repo, req) || repo.owner.toString() !== userId) {
            res.status(403).json({ message: "Only the owner can close this pull request" });
            return;
        }
        pr.status = "closed";
        yield pr.save();
        res.json({ message: "Pull request closed" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get("/:repoId/branches", auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId).lean();
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        const isCollaborator = isUserCollaborator(repo, req);
        if (repo.isPrivate && !isCollaborator) {
            res.status(403).json({ message: "You do not have access to this repository" });
            return;
        }
        const branches = yield File_1.File.distinct("branch", { repository: repoId });
        res.json(branches);
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.delete("/:repoId/file", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, branch } = req.body;
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        if (!isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to delete files" });
            return;
        }
        yield File_1.File.deleteOne({ repository: repoId, name, branch });
        res.json({ message: "File deleted" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get('/:repoId/lang-stats', auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoId = req.params.repoId;
        const files = yield File_1.File.find({ repository: repoId }).select('name content').lean();
        const stats = (0, detectLanguageStats_1.getLanguageStats)(files);
        res.json(stats);
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.post('/:repoId/ai-review', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { diff, prId } = req.body;
        if (!diff || !prId) {
            res.status(400).json({ message: "Missing code diff or PR id" });
            return;
        }
        const prompt = `Analyze this code diff and return feedback on potential bugs, performance, and best practices.\n\n${diff}`;
        const mistralRes = yield axios_1.default.post('http://127.0.0.1:11434/v1/chat/completions', {
            model: "mistral",
            messages: [
                { role: "system", content: "You are a senior code reviewer." },
                { role: "user", content: prompt }
            ],
            max_tokens: 1024,
            temperature: 0.2
        });
        const aiFeedback = ((_c = (_b = (_a = mistralRes.data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "No feedback.";
        yield PullRequest_1.PullRequest.findByIdAndUpdate(prId, { aiFeedback });
        res.json({ feedback: aiFeedback });
    }
    catch (err) {
        console.error("AI review error:", err);
        res.status(500).json({ message: "AI review failed" });
    }
}));
router.post('/:repoId/ai-summary', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { diff, prId } = req.body;
        if (!diff || !prId) {
            res.status(400).json({ message: "Missing code diff or PR id" });
            return;
        }
        const prompt = `Summarize the following code diff in a few sentences, highlighting the main changes and their purpose:\n\n${diff}`;
        const mistralRes = yield axios_1.default.post('http://127.0.0.1:11434/v1/chat/completions', {
            model: "mistral",
            messages: [
                { role: "system", content: "You are a senior software engineer." },
                { role: "user", content: prompt }
            ],
            max_tokens: 512,
            temperature: 0.3
        });
        const aiSummary = ((_c = (_b = (_a = mistralRes.data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "No summary.";
        yield PullRequest_1.PullRequest.findByIdAndUpdate(prId, { aiSummary });
        res.json({ summary: aiSummary });
    }
    catch (err) {
        console.error("AI summary error:", err);
        res.status(500).json({ message: "AI summary failed" });
    }
}));
router.post('/:repoId/ai-explain-file', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { fileContent, fileName } = req.body;
        if (!fileContent || !fileName) {
            res.status(400).json({ message: "Missing file content or name" });
            return;
        }
        const prompt = `Explain in simple terms what the following file (${fileName}) does:\n\n${fileContent}`;
        const mistralRes = yield axios_1.default.post('http://127.0.0.1:11434/v1/chat/completions', {
            model: "mistral",
            messages: [
                { role: "system", content: "You are a helpful programming assistant." },
                { role: "user", content: prompt }
            ],
            max_tokens: 512,
            temperature: 0.3
        });
        const aiExplanation = ((_c = (_b = (_a = mistralRes.data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "No explanation.";
        res.json({ explanation: aiExplanation });
    }
    catch (err) {
        console.error("AI explain error:", err);
        res.status(500).json({ message: "AI explain failed" });
    }
}));
router.post('/:repoId/ai-commit-message', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { diff } = req.body;
        if (!diff) {
            res.status(400).json({ message: "Missing code diff" });
            return;
        }
        const prompt = `Suggest a concise and descriptive commit message for the following code diff:\n\n${diff}`;
        const mistralRes = yield axios_1.default.post('http://127.0.0.1:11434/v1/chat/completions', {
            model: "mistral",
            messages: [
                { role: "system", content: "You are a senior developer." },
                { role: "user", content: prompt }
            ],
            max_tokens: 100,
            temperature: 0.2
        });
        const aiCommitMsg = ((_c = (_b = (_a = mistralRes.data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "No suggestion.";
        res.json({ commitMessage: aiCommitMsg });
    }
    catch (err) {
        console.error("AI commit message error:", err);
        res.status(500).json({ message: "AI commit message failed" });
    }
}));
router.post("/pull-request/:prId/comment", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const { content } = req.body;
        if (!content) {
            res.status(400).json({ message: "Missing comment content" });
            return;
        }
        const pr = yield PullRequest_1.PullRequest.findById(req.params.prId);
        if (!pr) {
            res.status(404).json({ message: "PR not found" });
            return;
        }
        const repo = yield Repository_1.Repository.findById(pr.repository);
        if (!repo || !isUserCollaborator(repo, req)) {
            res.status(403).json({ message: "You do not have permission to comment on this PR" });
            return;
        }
        const comment = yield Comment_1.default.create({
            prId: pr._id,
            author: userId,
            content,
        });
        res.status(201).json(comment);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Listare comentarii pentru un PR
router.get("/pull-request/:prId/comments", auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pr = yield PullRequest_1.PullRequest.findById(req.params.prId);
        if (!pr) {
            res.status(404).json({ message: "PR not found" });
            return;
        }
        const comments = yield Comment_1.default.find({ prId: pr._id })
            .sort({ createdAt: 1 })
            .populate("author", "name email avatar");
        res.json(comments);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Rută pentru verificarea datelor sensibile (utilitar pentru dezvoltatori)
router.post("/security/check", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            res.status(400).json({ message: "Text field is required" });
            return;
        }
        const containsSensitive = (0, uriSanitizer_1.containsSensitiveData)(text);
        const detectedPatterns = (0, uriSanitizer_1.getDetectedPatterns)(text);
        const maskedText = (0, uriSanitizer_1.maskSensitiveData)(text);
        res.json({
            original: text,
            containsSensitiveData: containsSensitive,
            detectedPatterns,
            masked: maskedText,
            warning: containsSensitive ? "Sensitive data detected and would be masked if saved" : "No sensitive data detected"
        });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// 🎯 VIZUALIZARE REPO - ACEASTĂ RUTĂ TREBUIE SĂ FIE ULTIMĂ!
// Vizualizare repo (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId", auth_1.authenticateJWToptional, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const start = Date.now();
    try {
        const repoId = req.params.repoId;
        const userId = getUserId(req);
        console.log(`[RepoView] Start request for repo ${repoId}`);
        // Verifică dacă ID-ul este valid ObjectId
        if (!repoId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log(`[RepoView] Invalid ObjectId: ${repoId}`);
            res.status(400).json({ message: "Invalid repository ID" });
            return;
        }
        const repo = yield Repository_1.Repository.findById(repoId)
            .populate("owner", "name email avatar")
            .lean();
        if (!repo) {
            console.log(`[RepoView] Repo not found`);
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        const isCollaborator = isUserCollaborator(repo, req);
        if (repo.isPrivate && !isCollaborator) {
            console.log(`[RepoView] Access denied for user ${userId || "anon"}`);
            res.status(403).json({ message: "You do not have access to this repository" });
            return;
        }
        let files = [];
        const branch = req.query.branch || "main";
        const filesStart = Date.now();
        if (isCollaborator) {
            files = yield File_1.File.find({ repository: repoId, branch })
                .select("name author createdAt content")
                .lean();
        }
        else {
            files = yield File_1.File.find({ repository: repoId, branch })
                .limit(20)
                .select("name author createdAt content")
                .lean();
        }
        console.log(`[RepoView] Files query took ${Date.now() - filesStart} ms, files.length=${files.length}`);
        const repoWithStars = addStarInfo(repo, userId);
        res.json(Object.assign(Object.assign({}, repoWithStars), { files,
            isCollaborator }));
        console.log(`[RepoView] Total request took ${Date.now() - start} ms`);
    }
    catch (err) {
        console.log(`[RepoView] ERROR:`, err);
        res.status(500).json({ message: "Server error" });
    }
}));
exports.default = router;

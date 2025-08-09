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
const auth_1 = require("./auth");
const Organization_1 = __importDefault(require("../models/Organization"));
const Repository_1 = require("../models/Repository");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// Helper function to get user ID
function getUserId(req) {
    var _a, _b;
    const user = req.user;
    return ((_a = user === null || user === void 0 ? void 0 : user._id) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = user === null || user === void 0 ? void 0 : user.id) === null || _b === void 0 ? void 0 : _b.toString());
}
// Creează o organizație nouă
router.post("/new", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        if (!name) {
            res.status(400).json({ message: "Name required" });
            return;
        }
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const org = yield Organization_1.default.create({
            name,
            description,
            owner: userId,
            members: [userId],
            repositories: [],
        });
        res.status(201).json(org);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Listează organizațiile userului
router.get("/my", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const orgs = yield Organization_1.default.find({
            members: userId,
        })
            .populate("owner", "name email");
        res.json(orgs);
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Detalii organizație (inclusiv membri și repo-uri)
router.get("/:orgId", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const org = yield Organization_1.default.findById(req.params.orgId)
            .populate("owner", "name email")
            .populate("members", "name email")
            .populate("repositories", "name description");
        if (!org) {
            res.status(404).json({ message: "Not found" });
            return;
        }
        res.json(org);
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Invită membru (doar owner)
router.post("/:orgId/invite", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId: targetUserId } = req.body;
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const org = yield Organization_1.default.findById(req.params.orgId);
        if (!org) {
            res.status(404).json({ message: "Not found" });
            return;
        }
        if (org.owner.toString() !== userId) {
            res.status(403).json({ message: "Only owner can invite" });
            return;
        }
        if (org.members.includes(targetUserId)) {
            res.status(400).json({ message: "Already member" });
            return;
        }
        org.members.push(targetUserId);
        yield org.save();
        res.json({ message: "User added" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Adaugă un repository la organizație (doar owner)
router.post("/:orgId/add-repo", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { repoId } = req.body;
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const org = yield Organization_1.default.findById(req.params.orgId);
        if (!org) {
            res.status(404).json({ message: "Not found" });
            return;
        }
        if (org.owner.toString() !== userId) {
            res.status(403).json({ message: "Only owner can add repositories" });
            return;
        }
        const repoObjectId = new mongoose_1.default.Types.ObjectId(repoId);
        if (org.repositories.some((id) => id.toString() === repoId)) {
            res.status(400).json({ message: "Repository already added" });
            return;
        }
        org.repositories.push(repoObjectId);
        yield org.save();
        // Opțional: setează și organization pe repo
        yield Repository_1.Repository.findByIdAndUpdate(repoId, { organization: org._id });
        res.json({ message: "Repository added" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
exports.default = router;

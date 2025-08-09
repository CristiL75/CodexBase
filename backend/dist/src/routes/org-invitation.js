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
const OrgInvitation_1 = require("../models/OrgInvitation");
const Organization_1 = __importDefault(require("../models/Organization"));
const router = express_1.default.Router();
// Helper function to get user ID
function getUserId(req) {
    var _a, _b;
    const user = req.user;
    return ((_a = user === null || user === void 0 ? void 0 : user._id) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = user === null || user === void 0 ? void 0 : user.id) === null || _b === void 0 ? void 0 : _b.toString());
}
router.get("/my", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const invitations = yield OrgInvitation_1.OrgInvitation.find({ user: userId, status: "pending" })
            .populate("organization", "name");
        res.json({ invitations });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Trimite invitație (doar owner)
router.post("/:orgId/invite", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const currentUserId = getUserId(req);
        if (!currentUserId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const org = yield Organization_1.default.findById(req.params.orgId);
        if (!org) {
            res.status(404).json({ message: "Organization not found" });
            return;
        }
        if (org.owner.toString() !== currentUserId) {
            res.status(403).json({ message: "Only owner can invite" });
            return;
        }
        // Nu permite invitarea ownerului
        if (org.owner.toString() === userId) {
            res.status(400).json({ message: "Owner cannot be invited" });
            return;
        }
        // Nu permite invitarea unui membru deja existent
        if (org.members.map((m) => m.toString()).includes(userId)) {
            res.status(400).json({ message: "User is already a member of the organization" });
            return;
        }
        // Verifică dacă există deja invitație
        const existing = yield OrgInvitation_1.OrgInvitation.findOne({ user: userId, organization: org._id, status: "pending" });
        if (existing) {
            res.status(400).json({ message: "User already invited" });
            return;
        }
        yield OrgInvitation_1.OrgInvitation.create({ user: userId, organization: org._id });
        res.json({ message: "Invitation sent" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Acceptă invitația
router.post("/:invitationId/accept", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const invitation = yield OrgInvitation_1.OrgInvitation.findOne({ _id: req.params.invitationId, user: userId, status: "pending" });
        if (!invitation) {
            res.status(404).json({ message: "Invitation not found" });
            return;
        }
        invitation.status = "accepted";
        yield invitation.save();
        // Adaugă userul ca membru în organizație
        yield Organization_1.default.findByIdAndUpdate(invitation.organization, { $addToSet: { members: userId } });
        res.json({ message: "Invitation accepted" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Refuză invitația
router.post("/:invitationId/decline", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        const invitation = yield OrgInvitation_1.OrgInvitation.findOne({ _id: req.params.invitationId, user: userId, status: "pending" });
        if (!invitation) {
            res.status(404).json({ message: "Invitation not found" });
            return;
        }
        invitation.status = "declined";
        yield invitation.save();
        res.json({ message: "Invitation declined" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
exports.default = router;

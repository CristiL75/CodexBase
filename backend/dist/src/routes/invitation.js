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
const Repository_1 = require("../models/Repository");
const Invitation_1 = require("../models/Invitation");
const router = express_1.default.Router();
// Invită un utilizator (creează invitație)
router.post("/:repoId/invite", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const repoId = req.params.repoId;
        const repo = yield Repository_1.Repository.findById(repoId);
        if (!repo) {
            res.status(404).json({ message: "Repository not found" });
            return;
        }
        // Doar owner sau colaborator poate invita
        if (repo.owner.toString() !== req.user.id &&
            !repo.collaborators.some((id) => id.toString() === req.user.id)) {
            res.status(403).json({ message: "Not allowed" });
            return;
        }
        // Nu adăuga de două ori același user ca invitat sau colaborator
        const existingInvitation = yield Invitation_1.Invitation.findOne({
            user: userId,
            repository: repoId,
            status: "pending"
        });
        if (repo.collaborators.some((id) => id.toString() === userId) ||
            repo.owner.toString() === userId ||
            existingInvitation) {
            res.status(400).json({ message: "User is already a collaborator, owner, or already invited" });
            return;
        }
        yield Invitation_1.Invitation.create({
            user: userId,
            repository: repoId,
            status: "pending"
        });
        res.json({ message: "Invitation sent!" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Listare invitații pentru userul logat (doar pending)
router.get("/my", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invitations = yield Invitation_1.Invitation.find({ user: req.user.id, status: "pending" })
            .populate('repository');
        res.json({ invitations });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Acceptă invitația
router.post("/:invitationId/accept", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invitation = yield Invitation_1.Invitation.findOne({ _id: req.params.invitationId, user: req.user.id, status: "pending" });
        if (!invitation) {
            res.status(404).json({ message: "Invitation not found" });
            return;
        }
        invitation.status = "accepted";
        yield invitation.save();
        // Adaugă userul ca și colaborator
        yield Repository_1.Repository.findByIdAndUpdate(invitation.repository, { $addToSet: { collaborators: req.user.id } });
        res.json({ message: "Invitation accepted" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Refuză invitația
router.post("/:invitationId/decline", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const invitation = yield Invitation_1.Invitation.findOne({ _id: req.params.invitationId, user: req.user.id, status: "pending" });
        if (!invitation) {
            res.status(404).json({ message: "Invitation not found" });
            return;
        }
        invitation.status = "declined";
        yield invitation.save();
        res.json({ message: "Invitation declined" });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
exports.default = router;

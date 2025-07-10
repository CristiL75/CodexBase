import express from "express";
import { authenticateJWT } from "./auth";
import { Repository } from "../models/Repository";
import { Invitation } from "../models/Invitation";

const router = express.Router();

// Invită un utilizator (creează invitație)
router.post("/:repoId/invite", authenticateJWT, async (req: any, res) => {
  try {
    const { userId } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);

    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    // Doar owner sau colaborator poate invita
    if (
      repo.owner.toString() !== req.user.id &&
      !repo.collaborators.some((id: any) => id.toString() === req.user.id)
    ) {
      res.status(403).json({ message: "Not allowed" });
      return;
    }

    // Nu adăuga de două ori același user ca invitat sau colaborator
    const existingInvitation = await Invitation.findOne({
      user: userId,
      repository: repoId,
      status: "pending"
    });
    if (
      repo.collaborators.some((id: any) => id.toString() === userId) ||
      repo.owner.toString() === userId ||
      existingInvitation
    ) {
      res.status(400).json({ message: "User is already a collaborator, owner, or already invited" });
      return;
    }

    await Invitation.create({
      user: userId,
      repository: repoId,
      status: "pending"
    });

    res.json({ message: "Invitation sent!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Listare invitații pentru userul logat (doar pending)
router.get("/my", authenticateJWT, async (req: any, res) => {
  try {
    const invitations = await Invitation.find({ user: req.user.id, status: "pending" })
      .populate('repository');
    res.json({ invitations });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Acceptă invitația
router.post("/:invitationId/accept", authenticateJWT, async (req: any, res) => {
  try {
    const invitation = await Invitation.findOne({ _id: req.params.invitationId, user: req.user.id, status: "pending" });
    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    invitation.status = "accepted";
    await invitation.save();

    // Adaugă userul ca și colaborator
    await Repository.findByIdAndUpdate(invitation.repository, { $addToSet: { collaborators: req.user.id } });

    res.json({ message: "Invitation accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Refuză invitația
router.post("/:invitationId/decline", authenticateJWT, async (req: any, res) => {
  try {
    const invitation = await Invitation.findOne({ _id: req.params.invitationId, user: req.user.id, status: "pending" });
    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    invitation.status = "declined";
    await invitation.save();

    res.json({ message: "Invitation declined" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
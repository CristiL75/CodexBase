import express from "express";
import { authenticateJWT } from "./auth";
import { OrgInvitation } from "../models/OrgInvitation";
import Organization from "../models/Organization";

const router = express.Router();


router.get("/my", authenticateJWT, async (req, res) => {
  try {
    const invitations = await OrgInvitation.find({ user: req.user.id, status: "pending" })
      .populate("organization", "name");
    res.json({ invitations });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});
// Trimite invitație (doar owner)
router.post("/:orgId/invite", authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.body;
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.owner.toString() !== req.user.id) return res.status(403).json({ message: "Only owner can invite" });

    // Verifică dacă există deja invitație
    const existing = await OrgInvitation.findOne({ user: userId, organization: org._id, status: "pending" });
    if (existing) return res.status(400).json({ message: "User already invited" });

    await OrgInvitation.create({ user: userId, organization: org._id });
    res.json({ message: "Invitation sent" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Acceptă invitația
router.post("/:invitationId/accept", authenticateJWT, async (req, res) => {
  try {
    const invitation = await OrgInvitation.findOne({ _id: req.params.invitationId, user: req.user.id, status: "pending" });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });

    invitation.status = "accepted";
    await invitation.save();

    // Adaugă userul ca membru în organizație
    await Organization.findByIdAndUpdate(invitation.organization, { $addToSet: { members: req.user.id } });

    res.json({ message: "Invitation accepted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Refuză invitația
router.post("/:invitationId/decline", authenticateJWT, async (req, res) => {
  try {
    const invitation = await OrgInvitation.findOne({ _id: req.params.invitationId, user: req.user.id, status: "pending" });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });

    invitation.status = "declined";
    await invitation.save();

    res.json({ message: "Invitation declined" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
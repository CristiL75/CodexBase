import express, { Request, Response } from "express";
import { authenticateJWT } from "./auth";
import { OrgInvitation } from "../models/OrgInvitation";
import Organization from "../models/Organization";

const router = express.Router();

// Helper function to get user ID
function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?._id?.toString() || user?.id?.toString();
}

router.get("/my", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const invitations = await OrgInvitation.find({ user: userId, status: "pending" })
      .populate("organization", "name");
    res.json({ invitations });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Trimite invitație (doar owner)
router.post("/:orgId/invite", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const currentUserId = getUserId(req);
    
    if (!currentUserId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const org = await Organization.findById(req.params.orgId);
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
    if (org.members.map((m: any) => m.toString()).includes(userId)) {
      res.status(400).json({ message: "User is already a member of the organization" });
      return;
    }

    // Verifică dacă există deja invitație
    const existing = await OrgInvitation.findOne({ user: userId, organization: org._id, status: "pending" });
    if (existing) {
      res.status(400).json({ message: "User already invited" });
      return;
    }

    await OrgInvitation.create({ user: userId, organization: org._id });
    res.json({ message: "Invitation sent" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Acceptă invitația
router.post("/:invitationId/accept", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const invitation = await OrgInvitation.findOne({ _id: req.params.invitationId, user: userId, status: "pending" });
    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    invitation.status = "accepted";
    await invitation.save();

    // Adaugă userul ca membru în organizație
    await Organization.findByIdAndUpdate(invitation.organization, { $addToSet: { members: userId } });

    res.json({ message: "Invitation accepted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Refuză invitația
router.post("/:invitationId/decline", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const invitation = await OrgInvitation.findOne({ _id: req.params.invitationId, user: userId, status: "pending" });
    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    invitation.status = "declined";
    await invitation.save();

    res.json({ message: "Invitation declined" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
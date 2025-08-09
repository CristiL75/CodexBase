import express, { Request, Response } from "express";
import { authenticateJWT } from "./auth";
import Organization from "../models/Organization";
import { User } from "../models/User";
import { Repository } from "../models/Repository";
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to get user ID
function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?._id?.toString() || user?.id?.toString();
}

// Creează o organizație nouă
router.post("/new", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
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
    
    const org = await Organization.create({
      name,
      description,
      owner: userId,
      members: [userId],
      repositories: [],
    });
    res.status(201).json(org);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Listează organizațiile userului
router.get("/my", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    const orgs = await Organization.find({
      members: userId,
    })
      .populate("owner", "name email");
    res.json(orgs);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Detalii organizație (inclusiv membri și repo-uri)
router.get(
  "/:orgId",
  authenticateJWT,
  async (
    req: express.Request<{ orgId: string }>,
    res: express.Response
  ): Promise<void> => {
    try {
      const org = await Organization.findById(req.params.orgId)
        .populate("owner", "name email")
        .populate("members", "name email")
        .populate("repositories", "name description");
      if (!org) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(org);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Invită membru (doar owner)
router.post("/:orgId/invite", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.body;
    const userId = getUserId(req);
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    
    const org = await Organization.findById(req.params.orgId);
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
    await org.save();
    res.json({ message: "User added" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Adaugă un repository la organizație (doar owner)
router.post(
  "/:orgId/add-repo",
  authenticateJWT,
  async (
    req: express.Request<{ orgId: string }, any, { repoId: string }>,
    res: express.Response
  ): Promise<void> => {
    try {
      const { repoId } = req.body;
      const userId = getUserId(req);
      
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      
      const org = await Organization.findById(req.params.orgId);
      if (!org) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      
      if (org.owner.toString() !== userId) {
        res.status(403).json({ message: "Only owner can add repositories" });
        return;
      }
      
      const repoObjectId = new mongoose.Types.ObjectId(repoId);
      if (org.repositories.some((id: any) => id.toString() === repoId)) {
        res.status(400).json({ message: "Repository already added" });
        return;
      }
      
      org.repositories.push(repoObjectId);
      await org.save();
      // Opțional: setează și organization pe repo
      await Repository.findByIdAndUpdate(repoId, { organization: org._id });
      res.json({ message: "Repository added" });
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
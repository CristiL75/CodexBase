import express from "express";
import { authenticateJWT } from "./auth";
import Organization from "../models/Organization";
import { User } from "../models/User";
import { Repository } from "../models/Repository";


const router = express.Router();

// Creează o organizație nouă
router.post("/new", authenticateJWT, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });
    const org = await Organization.create({
      name,
      description,
      owner: req.user.id,
      members: [req.user.id],
      repositories: [],
    });
    res.status(201).json(org);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Listează organizațiile userului
router.get("/my", authenticateJWT, async (req, res) => {
  try {
    const orgs = await Organization.find({
      members: req.user.id,
    })
      .populate("owner", "name email"); // <-- adaugă populate aici
    res.json(orgs);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Detalii organizație (inclusiv membri și repo-uri)
router.get("/:orgId", authenticateJWT, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId)
      .populate("owner", "name email")
      .populate("members", "name email")
      .populate("repositories", "name description");
    if (!org) return res.status(404).json({ message: "Not found" });
    res.json(org);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Invită membru (doar owner)
router.post("/:orgId/invite", authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.body;
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Not found" });
    if (org.owner.toString() !== req.user.id) return res.status(403).json({ message: "Only owner can invite" });
    if (org.members.includes(userId)) return res.status(400).json({ message: "Already member" });
    org.members.push(userId);
    await org.save();
    res.json({ message: "User added" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Adaugă un repository la organizație (doar owner)
router.post("/:orgId/add-repo", authenticateJWT, async (req, res) => {
  try {
    const { repoId } = req.body;
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Not found" });
    if (org.owner.toString() !== req.user.id) return res.status(403).json({ message: "Only owner can add repositories" });
    if (org.repositories.includes(repoId)) return res.status(400).json({ message: "Repository already added" });
    org.repositories.push(repoId);
    await org.save();
    // Opțional: setează și organization pe repo
    await Repository.findByIdAndUpdate(repoId, { organization: org._id });
    res.json({ message: "Repository added" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});




export default router;
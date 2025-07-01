import express from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT } from "./auth";
import { Repository } from "../models/Repository";
import { User } from "../models/User";
import { File } from "../models/File";
import { Invitation } from '../models/Invitation';



const router = express.Router();

// Creează un repository nou
router.post(
  "/new",
  authenticateJWT,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").optional().isString(),
    body("isPrivate").optional().isBoolean(),
    body("collaborators").optional().isArray(),
  ],
  async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, description, isPrivate, collaborators } = req.body;
      // Adaugă owner-ul și ca membru implicit
      const allCollaborators = collaborators && collaborators.length
        ? [...new Set([req.user.id, ...collaborators])]
        : [req.user.id];

      const repo = await Repository.create({
        name,
        description,
        isPrivate: isPrivate ?? false,
        owner: req.user.id,
        collaborators: allCollaborators,
      });
      res.status(201).json(repo);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Listare repo-uri ale userului (owner sau colaborator) - varianta corectă și unică
router.get("/my", authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const repos = await Repository.find({
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    })
      .populate("owner", "name email avatar")
      .populate("collaborators", "name email avatar")
      .lean();

    repos.forEach(repo => {
      repo.isStarred = Array.isArray(repo.starredBy)
        ? repo.starredBy.some((id: any) => id.toString() === userId)
        : false;
      repo.stars = Array.isArray(repo.starredBy) ? repo.starredBy.length : 0;
      delete repo.starredBy;
    });

    res.json(repos);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// Marchează/demarchează stea pe repo
router.post("/star/:id", authenticateJWT, async (req: any, res) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const userId = req.user.id;
    const hasStar = repo.starredBy.some((id: any) => id.toString() === userId);

    if (hasStar) {
      repo.starredBy = repo.starredBy.filter((id: any) => id.toString() !== userId);
    } else {
      repo.starredBy.push(userId);
    }
    await repo.save();
    res.json({ starred: !hasStar, stars: repo.starredBy.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});



router.post("/:repoId/files", authenticateJWT, async (req: any, res) => {
  try {
    const { name, content } = req.body;
    const repoId = req.params.repoId;
    const file = await File.create({
      repository: repoId,
      name,
      content,
      author: req.user.id,
    });
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Listare fișiere dintr-un repository
router.get("/:repoId/files", authenticateJWT, async (req, res) => {
  try {
    const files = await File.find({ repository: req.params.repoId });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Star/unstar repository (deja există, dar îl pun aici pentru claritate)
router.post("/star/:id", authenticateJWT, async (req: any, res) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const userId = req.user.id;
    const hasStar = repo.starredBy.some((id: any) => id.toString() === userId);

    if (hasStar) {
      repo.starredBy = repo.starredBy.filter((id: any) => id.toString() !== userId);
    } else {
      repo.starredBy.push(userId);
    }
    await repo.save();
    res.json({ starred: !hasStar, stars: repo.starredBy.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Invită un utilizator existent într-un repository (doar owner sau colaborator poate invita)

router.delete("/:repoId", authenticateJWT, async (req: any, res) => {
  try {
    const repo = await Repository.findById(req.params.repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    // Permite ștergerea doar dacă userul este owner
    if (repo.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the owner can delete this repository" });
    }

    // Șterge toate fișierele asociate repo-ului
    await File.deleteMany({ repository: repo._id });

    // Șterge repo-ul
    await repo.deleteOne();

    res.json({ message: "Repository deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
export default router;
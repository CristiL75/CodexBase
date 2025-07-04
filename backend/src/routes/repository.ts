import express from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT } from "./auth";
import { Repository } from "../models/Repository";
import { User } from "../models/User";
import { File } from "../models/File";
import { Invitation } from '../models/Invitation';
import { Commit } from "../models/Commit";


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




router.post("/:repoId/commit", authenticateJWT, async (req: any, res) => {
  try {
    const { message, files } = req.body; // files: [{name, content}]
    const repoId = req.params.repoId;

    // Creează/actualizează fișierele în colecția File
    for (const file of files) {
      await File.findOneAndUpdate(
        { repository: repoId, name: file.name },
        {
          $set: {
            content: file.content,
            author: req.user.id,
          },
        },
        { upsert: true, new: true }
      );
    }

    // Creează commit-ul
    const commit = await Commit.create({
      repository: repoId,
      author: req.user.id,
      message,
      files,
    });
    res.status(201).json(commit);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:repoId/commits", authenticateJWT, async (req, res) => {
  try {
    const commits = await Commit.find({ repository: req.params.repoId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', 'name email');
    res.json(commits);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:repoId/clone", authenticateJWT, async (req, res) => {
  try {
    const files = await File.find({ repository: req.params.repoId });
    const commits = await Commit.find({ repository: req.params.repoId }).sort({ createdAt: 1 });
    res.json({ files, commits });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:repoId/pull", authenticateJWT, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    // Poți trimite un parametru ?since=<hash> ca să primești doar commit-urile noi
    const sinceHash = req.query.since as string | undefined;

    let commits;
    if (sinceHash) {
      // Găsește commit-ul cu hash-ul respectiv și returnează doar cele mai noi
      const sinceCommit = await Commit.findOne({ repository: repoId, hash: sinceHash });
      if (!sinceCommit) return res.status(404).json({ message: "Commit not found" });
      commits = await Commit.find({
        repository: repoId,
        createdAt: { $gt: sinceCommit.createdAt }
      }).sort({ createdAt: 1 });
    } else {
      // Toate commit-urile
      commits = await Commit.find({ repository: repoId }).sort({ createdAt: 1 });
    }

    const files = await File.find({ repository: repoId });
    res.json({ commits, files });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
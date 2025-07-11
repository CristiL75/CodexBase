import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT, authenticateJWToptional } from "./auth";
import { Repository } from "../models/Repository";
import { User } from "../models/User";
import { File } from "../models/File";
import { Invitation } from '../models/Invitation';
import { Commit } from "../models/Commit";
import { PullRequest } from "../models/PullRequest";
import { getLanguageStats } from '../utils/detectLanguageStats';
import Comment from "../models/Comment";
import mongoose from 'mongoose';
import axios from 'axios';

const router = express.Router();

// Helper function to get user ID
function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?._id?.toString() || user?.id?.toString();
}

// Helper pentru verificare colaborator/owner
function isUserCollaborator(repo: any, req: any): boolean {
  const userId = getUserId(req);
  if (!userId) return false;
  const ownerId = repo.owner?._id?.toString?.() || repo.owner?.toString?.() || repo.owner;
  return (
    ownerId === userId ||
    (repo.collaborators || []).some((c: any) =>
      (c?._id?.toString?.() || c?.toString?.() || c) === userId
    )
  );
}

// Helper to add star info
function addStarInfo(repo: any, userId?: string): any {
  const repoObj = repo.toObject ? repo.toObject() : { ...repo };
  repoObj.isStarred = userId && Array.isArray(repoObj.starredBy) 
    ? repoObj.starredBy.some((id: any) => id.toString() === userId)
    : false;
  repoObj.stars = Array.isArray(repoObj.starredBy) ? repoObj.starredBy.length : 0;
  delete repoObj.starredBy;
  return repoObj;
}

// 🎯 RUTELE SPECIFICE TREBUIE SĂ FIE PRIMELE (ÎNAINTE DE /:repoId)

// Rută pentru repository-uri publice
router.get("/public", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[RepoView] Fetching public repositories');
    const repos = await Repository.find({ isPrivate: false })
      .populate("owner", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    const reposWithStars = repos.map(repo => addStarInfo(repo));
    res.json(reposWithStars);
  } catch (error) {
    console.error('[RepoView] Error fetching public repos:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Rută pentru utilizatori populari (nu repository-uri populare)
router.get('/popular', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[RepoView] Fetching popular users');
    const users = await User.find({})
      .sort({ followers: -1 })
      .limit(12)
      .select('_id name email avatar followers')
      .lean();
    for (const user of users) {
      (user as any).repositories = await Repository.countDocuments({ owner: user._id });
    }
    res.json(users);
  } catch (error) {
    console.error('[RepoView] Error fetching popular users:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Listare repo-uri ale userului (owner sau colaborator)
router.get("/my", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const repos = await Repository.find({
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    })
      .populate("owner", "name email avatar")
      .populate("collaborators", "name email avatar")
      .lean();

    const reposWithStars = repos.map(repo => addStarInfo(repo, userId));
    res.json(reposWithStars);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/repositories", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const repos = await Repository.find({
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    });
    res.json(repos);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/activity/recent", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const user = await User.findById(userId).select("following");
    const followingIds = user?.following ? [...user.following, userId] : [userId];

    const repos = await Repository.find({ owner: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("owner", "email name");

    const starred = await Repository.find({ "starredBy": { $in: followingIds } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("owner", "email name")
      .populate("starredBy", "email name");

    const prs = await PullRequest.find({ author: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("author", "email name")
      .populate("repository", "name");

    const commits = await Commit.find({ author: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("author", "email name")
      .populate("repository", "name");

    res.json({
      repos,
      starred,
      prs,
      commits,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

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
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const userId = getUserId(req);
      if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const { name, description, isPrivate, collaborators } = req.body;
      const allCollaborators = collaborators && collaborators.length
        ? [...new Set([userId, ...collaborators])]
        : [userId];

      const repo = await Repository.create({
        name,
        description,
        isPrivate: isPrivate ?? false,
        owner: userId,
        collaborators: allCollaborators,
      });
      res.status(201).json(repo);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Marchează/demarchează stea pe repo
router.post("/star/:id", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const repo = await Repository.findById(req.params.id);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!repo.starredBy) {
      repo.starredBy = [];
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasStar = repo.starredBy.some((id: any) => id.toString() === userId);

    if (hasStar) {
      repo.starredBy = repo.starredBy.filter((id: any) => id.toString() !== userId);
    } else {
      repo.starredBy.push(userObjectId);
    }
    await repo.save();
    res.json({ starred: !hasStar, stars: repo.starredBy.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Pull request routes - TOATE RUTELE CU /:repoId LA ÎNCEPUT

// Adaugă fișier nou (doar colaboratori/owner)
router.post("/:repoId/files", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { name, content } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to modify this repository" });
      return;
    }

    const file = await File.create({
      repository: repoId,
      name,
      content,
      author: userId,
    });
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Listare fișiere dintr-un repository (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId/files", authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const branch = req.query.branch || "main";
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      res.status(403).json({ message: "You do not have access to this repository" });
      return;
    }

    let files = [];
    if (isCollaborator) {
      files = await File.find({ repository: repoId, branch })
        .select("name author createdAt content")
        .lean();
    } else {
      files = await File.find({ repository: repoId, branch })
        .limit(20)
        .select("name author createdAt content")
        .lean();
    }
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Commit pe branch (doar colaboratori/owner)
router.post("/:repoId/commit", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { message, files, branch = "main" } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to modify this repository" });
      return;
    }

    for (const file of files) {
      await File.findOneAndUpdate(
        { repository: repoId, name: file.name, branch },
        {
          $set: {
            content: file.content,
            author: userId,
          },
        },
        { upsert: true, new: true }
      );
    }

    const commit = await Commit.create({
      repository: repoId,
      branch,
      author: userId,
      message,
      files,
    });
    res.status(201).json(commit);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Listare commits (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId/commits", authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      res.status(403).json({ message: "You do not have access to this repository" });
      return;
    }

    const commits = await Commit.find({ repository: repoId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', 'name email');
    res.json(commits);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Clone repo (doar colaboratori/owner)
router.get("/:repoId/clone", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to clone this repository" });
      return;
    }

    const files = await File.find({ repository: repoId });
    const commits = await Commit.find({ repository: repoId }).sort({ createdAt: 1 });
    res.json({ files, commits });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Pull (doar colaboratori/owner)
router.get("/:repoId/pull", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const sinceHash = req.query.since as string | undefined;

    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to pull this repository" });
      return;
    }

    let commits;
    if (sinceHash) {
      const sinceCommit = await Commit.findOne({ repository: repoId, hash: sinceHash });
      if (!sinceCommit) {
        res.status(404).json({ message: "Commit not found" });
        return;
      }
      commits = await Commit.find({
        repository: repoId,
        createdAt: { $gt: sinceCommit.createdAt }
      }).sort({ createdAt: 1 });
    } else {
      commits = await Commit.find({ repository: repoId }).sort({ createdAt: 1 });
    }

    const files = await File.find({ repository: repoId });
    res.json({ commits, files });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Pull request routes (doar colaboratori/owner)
router.post("/:repoId/pull-request", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { sourceBranch, targetBranch, title, description } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to create pull requests" });
      return;
    }

    const sourceFiles = await File.find({ repository: repoId, branch: sourceBranch }).lean();
    const targetFiles = await File.find({ repository: repoId, branch: targetBranch }).lean();

    const targetMap = new Map(targetFiles.map(f => [f.name, f.content]));

    let diff = '';
    for (const file of sourceFiles) {
      const targetContent = targetMap.get(file.name);
      if (targetContent === undefined) {
        diff += `\n--- New file: ${file.name} ---\n${file.content}\n`;
      } else if (file.content !== targetContent) {
        diff += `\n--- Modified file: ${file.name} ---\n`;
        diff += `--- Old content ---\n${targetContent}\n`;
        diff += `--- New content ---\n${file.content}\n`;
      }
    }
    const sourceNames = new Set(sourceFiles.map(f => f.name));
    for (const file of targetFiles) {
      if (!sourceNames.has(file.name)) {
        diff += `\n--- Deleted file: ${file.name} ---\n${file.content}\n`;
      }
    }

    const pr = await PullRequest.create({
      repository: repoId,
      sourceBranch,
      targetBranch,
      author: userId,
      title,
      description,
      diff,
    });
    res.status(201).json(pr);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/pull-request/:prId/merge", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const pr = await PullRequest.findById(req.params.prId);
    if (!pr || pr.status !== "open") {
      res.status(404).json({ message: "PR not found or already closed" });
      return;
    }

    const repo = await Repository.findById(pr.repository);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }
    if (!isUserCollaborator(repo, req) || repo.owner.toString() !== userId) {
      res.status(403).json({ message: "Only the owner can merge this pull request" });
      return;
    }

    const files = await File.find({ repository: pr.repository, branch: pr.sourceBranch });
    for (const file of files) {
      await File.findOneAndUpdate(
        { repository: pr.repository, name: file.name, branch: pr.targetBranch },
        {
          $set: {
            content: file.content,
            author: file.author,
          },
        },
        { upsert: true, new: true }
      );
    }
    pr.status = "merged";
    await pr.save();
    res.json({ message: "Pull request merged" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:repoId/pull-requests", authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      res.status(403).json({ message: "You do not have access to this repository" });
      return;
    }

    const prs = await PullRequest.find({ repository: repoId }).sort({ createdAt: -1 });
    res.json(prs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:repoId/branch", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchName, fromBranch } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to create branches" });
      return;
    }

    if (fromBranch && fromBranch.trim() !== "") {
      const files = await File.find({ repository: repoId, branch: fromBranch });
      for (const file of files) {
        await File.create({
          repository: repoId,
          branch: branchName,
          name: file.name,
          content: file.content,
          author: file.author,
        });
      }
    }
    res.status(201).json({ message: "Branch created" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/pull-request/:prId/close", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const pr = await PullRequest.findById(req.params.prId);
    if (!pr || pr.status !== "open") {
      res.status(404).json({ message: "PR not found or already closed" });
      return;
    }

    const repo = await Repository.findById(pr.repository);
    if (!repo || !isUserCollaborator(repo, req) || repo.owner.toString() !== userId) {
      res.status(403).json({ message: "Only the owner can close this pull request" });
      return;
    }

    pr.status = "closed";
    await pr.save();
    res.json({ message: "Pull request closed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:repoId/branches", authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId).lean();
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      res.status(403).json({ message: "You do not have access to this repository" });
      return;
    }

    const branches = await File.distinct("branch", { repository: repoId });
    res.json(branches);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:repoId/file", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, branch } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    if (!isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to delete files" });
      return;
    }

    await File.deleteOne({ repository: repoId, name, branch });
    res.json({ message: "File deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/:repoId/lang-stats', authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const repoId = req.params.repoId;
    const files = await File.find({ repository: repoId }).select('name content').lean();
    const stats = getLanguageStats(files);
    res.json(stats);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/:repoId/ai-review', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { diff, prId } = req.body;
    if (!diff || !prId) {
      res.status(400).json({ message: "Missing code diff or PR id" });
      return;
    }

    const prompt = `Analyze this code diff and return feedback on potential bugs, performance, and best practices.\n\n${diff}`;

    const mistralRes = await axios.post('http://127.0.0.1:11434/v1/chat/completions', {
      model: "mistral",
      messages: [
        { role: "system", content: "You are a senior code reviewer." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    });

    const aiFeedback = mistralRes.data.choices?.[0]?.message?.content || "No feedback.";

    await PullRequest.findByIdAndUpdate(prId, { aiFeedback });

    res.json({ feedback: aiFeedback });
  } catch (err) {
    console.error("AI review error:", err);
    res.status(500).json({ message: "AI review failed" });
  }
});

router.post('/:repoId/ai-summary', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { diff, prId } = req.body;
    if (!diff || !prId) {
      res.status(400).json({ message: "Missing code diff or PR id" });
      return;
    }

    const prompt = `Summarize the following code diff in a few sentences, highlighting the main changes and their purpose:\n\n${diff}`;

    const mistralRes = await axios.post('http://127.0.0.1:11434/v1/chat/completions', {
      model: "mistral",
      messages: [
        { role: "system", content: "You are a senior software engineer." },
        { role: "user", content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.3
    });

    const aiSummary = mistralRes.data.choices?.[0]?.message?.content || "No summary.";
    await PullRequest.findByIdAndUpdate(prId, { aiSummary });
    res.json({ summary: aiSummary });
  } catch (err) {
    console.error("AI summary error:", err);
    res.status(500).json({ message: "AI summary failed" });
  }
});

router.post('/:repoId/ai-explain-file', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileContent, fileName } = req.body;
    if (!fileContent || !fileName) {
      res.status(400).json({ message: "Missing file content or name" });
      return;
    }

    const prompt = `Explain in simple terms what the following file (${fileName}) does:\n\n${fileContent}`;

    const mistralRes = await axios.post('http://127.0.0.1:11434/v1/chat/completions', {
      model: "mistral",
      messages: [
        { role: "system", content: "You are a helpful programming assistant." },
        { role: "user", content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.3
    });

    const aiExplanation = mistralRes.data.choices?.[0]?.message?.content || "No explanation.";
    res.json({ explanation: aiExplanation });
  } catch (err) {
    console.error("AI explain error:", err);
    res.status(500).json({ message: "AI explain failed" });
  }
});

router.post('/:repoId/ai-commit-message', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const { diff } = req.body;
    if (!diff) {
      res.status(400).json({ message: "Missing code diff" });
      return;
    }

    const prompt = `Suggest a concise and descriptive commit message for the following code diff:\n\n${diff}`;

    const mistralRes = await axios.post('http://127.0.0.1:11434/v1/chat/completions', {
      model: "mistral",
      messages: [
        { role: "system", content: "You are a senior developer." },
        { role: "user", content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.2
    });

    const aiCommitMsg = mistralRes.data.choices?.[0]?.message?.content || "No suggestion.";
    res.json({ commitMessage: aiCommitMsg });
  } catch (err) {
    console.error("AI commit message error:", err);
    res.status(500).json({ message: "AI commit message failed" });
  }
});

router.post("/pull-request/:prId/comment", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { content } = req.body;
    if (!content) {
      res.status(400).json({ message: "Missing comment content" });
      return;
    }

    const pr = await PullRequest.findById(req.params.prId);
    if (!pr) {
      res.status(404).json({ message: "PR not found" });
      return;
    }

    const repo = await Repository.findById(pr.repository);
    if (!repo || !isUserCollaborator(repo, req)) {
      res.status(403).json({ message: "You do not have permission to comment on this PR" });
      return;
    }

    const comment = await Comment.create({
      prId: pr._id,
      author: userId,
      content,
    });

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Listare comentarii pentru un PR
router.get("/pull-request/:prId/comments", authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  try {
    const pr = await PullRequest.findById(req.params.prId);
    if (!pr) {
      res.status(404).json({ message: "PR not found" });
      return;
    }

    const comments = await Comment.find({ prId: pr._id })
      .sort({ createdAt: 1 })
      .populate("author", "name email avatar");
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 🎯 VIZUALIZARE REPO - ACEASTĂ RUTĂ TREBUIE SĂ FIE ULTIMĂ!
// Vizualizare repo (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId", authenticateJWToptional, async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  try {
    const repoId = req.params.repoId;
    const userId = getUserId(req);
    console.log(`[RepoView] Start request for repo ${repoId}`);

    // Verifică dacă ID-ul este valid ObjectId
    if (!repoId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log(`[RepoView] Invalid ObjectId: ${repoId}`);
      res.status(400).json({ message: "Invalid repository ID" });
      return;
    }

    const repo = await Repository.findById(repoId)
      .populate("owner", "name email avatar")
      .lean();
    if (!repo) {
      console.log(`[RepoView] Repo not found`);
      res.status(404).json({ message: "Repository not found" });
      return;
    }

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      console.log(`[RepoView] Access denied for user ${userId || "anon"}`);
      res.status(403).json({ message: "You do not have access to this repository" });
      return;
    }

    let files = [];
    const branch = req.query.branch || "main";
    const filesStart = Date.now();
    if (isCollaborator) {
      files = await File.find({ repository: repoId, branch })
        .select("name author createdAt content")
        .lean();
    } else {
      files = await File.find({ repository: repoId, branch })
        .limit(20)
        .select("name author createdAt content")
        .lean();
    }
    console.log(`[RepoView] Files query took ${Date.now() - filesStart} ms, files.length=${files.length}`);

    const repoWithStars = addStarInfo(repo, userId);

    res.json({
      ...repoWithStars,
      files,
      isCollaborator,
    });
    console.log(`[RepoView] Total request took ${Date.now() - start} ms`);
  } catch (err) {
    console.log(`[RepoView] ERROR:`, err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
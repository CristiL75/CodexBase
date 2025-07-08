import express from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT, authenticateJWToptional } from "./auth";
import { Repository } from "../models/Repository";
import { User } from "../models/User";
import { File } from "../models/File";
import { Invitation } from '../models/Invitation';
import { Commit } from "../models/Commit";
import { PullRequest } from "../models/PullRequest";
import { getLanguageStats } from '../utils/detectLanguageStats';
import axios from 'axios';

const router = express.Router();

// Helper pentru verificare colaborator/owner
function isUserCollaborator(repo: any, req: any) {
  if (!req.user) return false;
  const userId = req.user.id?.toString?.() || req.user._id?.toString?.() || req.user;
  const ownerId = repo.owner?._id?.toString?.() || repo.owner?.toString?.() || repo.owner;
  return (
    ownerId === userId ||
    (repo.collaborators || []).some((c: any) =>
      (c?._id?.toString?.() || c?.toString?.() || c) === userId
    )
  );
}

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

// Listare repo-uri ale userului (owner sau colaborator)
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

// Adaugă fișier nou (doar colaboratori/owner)
router.post("/:repoId/files", authenticateJWT, async (req: any, res) => {
  try {
    const { name, content } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to modify this repository" });
    }

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

// Listare fișiere dintr-un repository (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId/files", authenticateJWToptional, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const branch = req.query.branch || "main";
    const repo = await Repository.findById(repoId).lean();
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      return res.status(403).json({ message: "You do not have access to this repository" });
    }

    let files = [];
    // Trimite content pentru toți (vizualizare cod), dar doar colaboratorii pot edita din frontend
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
router.post("/:repoId/commit", authenticateJWT, async (req: any, res) => {
  try {
    const { message, files, branch = "main" } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to modify this repository" });
    }

    for (const file of files) {
      await File.findOneAndUpdate(
        { repository: repoId, name: file.name, branch },
        {
          $set: {
            content: file.content,
            author: req.user.id,
          },
        },
        { upsert: true, new: true }
      );
    }

    const commit = await Commit.create({
      repository: repoId,
      branch,
      author: req.user.id,
      message,
      files,
    });
    res.status(201).json(commit);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Listare commits (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId/commits", authenticateJWToptional, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId).lean();
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      return res.status(403).json({ message: "You do not have access to this repository" });
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
router.get("/:repoId/clone", authenticateJWT, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to clone this repository" });
    }

    const files = await File.find({ repository: repoId });
    const commits = await Commit.find({ repository: repoId }).sort({ createdAt: 1 });
    res.json({ files, commits });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Pull (doar colaboratori/owner)
router.get("/:repoId/pull", authenticateJWT, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const sinceHash = req.query.since as string | undefined;

    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to pull this repository" });
    }

    let commits;
    if (sinceHash) {
      const sinceCommit = await Commit.findOne({ repository: repoId, hash: sinceHash });
      if (!sinceCommit) return res.status(404).json({ message: "Commit not found" });
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

// Vizualizare repo (public: oricine vede, privat: doar colaboratori/owner)
router.get("/:repoId", authenticateJWToptional, async (req, res) => {
  const start = Date.now();
  try {
    const repoId = req.params.repoId;
    console.log(`[RepoView] Start request for repo ${repoId}`);

    const repo = await Repository.findById(repoId)
      .populate("owner", "name email avatar")
      .lean();
    if (!repo) {
      console.log(`[RepoView] Repo not found`);
      return res.status(404).json({ message: "Not found" });
    }

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      console.log(`[RepoView] Access denied for user ${req.user ? req.user.id : "anon"}`);
      return res.status(403).json({ message: "You do not have access to this repository" });
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

    res.json({
      ...repo,
      files,
      isCollaborator,
    });
    console.log(`[RepoView] Total request took ${Date.now() - start} ms`);
  } catch (err) {
    console.log(`[RepoView] ERROR:`, err);
    res.status(500).json({ message: "Server error" });
  }
});

// Pull request routes (doar colaboratori/owner)
router.post("/:repoId/pull-request", authenticateJWT, async (req, res) => {
  try {
    const { sourceBranch, targetBranch, title, description } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to create pull requests" });
    }

    // Generează diff simplu între sourceBranch și targetBranch
    const sourceFiles = await File.find({ repository: repoId, branch: sourceBranch }).lean();
    const targetFiles = await File.find({ repository: repoId, branch: targetBranch }).lean();

    // Creează un map pentru targetFiles pentru acces rapid
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
      // Dacă fișierul există și e identic, nu adăuga nimic
    }
    // Fișiere șterse
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
      author: req.user.id,
      title,
      description,
      diff, // <-- salvează diff-ul aici
    });
    res.status(201).json(pr);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/pull-request/:prId/merge", authenticateJWT, async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.prId);
    if (!pr || pr.status !== "open") return res.status(404).json({ message: "PR not found or already closed" });

    const repo = await Repository.findById(pr.repository);
    if (!repo) return res.status(404).json({ message: "Repository not found" });
    if (!isUserCollaborator(repo, req) || repo.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the owner can merge this pull request" });
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

router.get("/:repoId/pull-requests", authenticateJWToptional, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId).lean();
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      return res.status(403).json({ message: "You do not have access to this repository" });
    }

    const prs = await PullRequest.find({ repository: repoId }).sort({ createdAt: -1 });
    res.json(prs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:repoId/branch", authenticateJWT, async (req, res) => {
  try {
    const { branchName, fromBranch } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to create branches" });
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

router.post("/pull-request/:prId/close", authenticateJWT, async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.prId);
    if (!pr || pr.status !== "open") return res.status(404).json({ message: "PR not found or already closed" });

    const repo = await Repository.findById(pr.repository);
    if (!repo || !isUserCollaborator(repo, req) || repo.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the owner can close this pull request" });
    }

    pr.status = "closed";
    await pr.save();
    res.json({ message: "Pull request closed" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:repoId/branches", authenticateJWToptional, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId).lean();
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const isCollaborator = isUserCollaborator(repo, req);
    if (repo.isPrivate && !isCollaborator) {
      return res.status(403).json({ message: "You do not have access to this repository" });
    }

    const branches = await File.distinct("branch", { repository: repoId });
    res.json(branches);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:repoId/file", authenticateJWT, async (req, res) => {
  try {
    const { name, branch } = req.body;
    const repoId = req.params.repoId;
    const repo = await Repository.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (!isUserCollaborator(repo, req)) {
      return res.status(403).json({ message: "You do not have permission to delete files" });
    }

    await File.deleteOne({ repository: repoId, name, branch });
    res.json({ message: "File deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/public", async (req, res) => {
  try {
    const repos = await Repository.find({ isPrivate: false })
      .populate("owner", "name email avatar")
      .lean();
    repos.forEach(repo => {
      repo.stars = Array.isArray(repo.starredBy) ? repo.starredBy.length : 0;
    });
    res.json(repos);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ followers: -1 })
      .limit(12)
      .select('_id name email avatar followers')
      .lean();
    for (const user of users) {
      user.repositories = await Repository.countDocuments({ owner: user._id });
    }
    res.json(users);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/activity/recent", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("following");
    const followingIds = user?.following ? [...user.following, req.user.id] : [req.user.id];

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

router.get('/:repoId/lang-stats', authenticateJWToptional, async (req, res) => {
  const repoId = req.params.repoId;
  const files = await File.find({ repository: repoId }).select('name content').lean();
  const stats = getLanguageStats(files);
  res.json(stats);
});

router.post('/:repoId/ai-review', authenticateJWT, async (req, res) => {
  try {
    const { diff, prId } = req.body;
    if (!diff || !prId) return res.status(400).json({ message: "Missing code diff or PR id" });

    // Prompt pentru Mistral
    const prompt = `Analyze this code diff and return feedback on potential bugs, performance, and best practices.\n\n${diff}`;

    // Trimite la Mistral local (API compatibil OpenAI)
    const mistralRes = await axios.post('http://127.0.0.1:11434/v1/chat/completions', {
      model: "mistral", // sau modelul tău
      messages: [
        { role: "system", content: "You are a senior code reviewer." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    });

    const aiFeedback = mistralRes.data.choices?.[0]?.message?.content || "No feedback.";

    // Salvează feedback-ul AI în PullRequest
    await PullRequest.findByIdAndUpdate(prId, { aiFeedback });

    res.json({ feedback: aiFeedback });
  } catch (err) {
    console.error("AI review error:", err);
    res.status(500).json({ message: "AI review failed" });
  }
});

router.post('/:repoId/ai-summary', authenticateJWT, async (req, res) => {
  try {
    const { diff, prId } = req.body;
    if (!diff || !prId) return res.status(400).json({ message: "Missing code diff or PR id" });

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

router.post('/:repoId/ai-explain-file', authenticateJWT, async (req, res) => {
  try {
    const { fileContent, fileName } = req.body;
    if (!fileContent || !fileName) return res.status(400).json({ message: "Missing file content or name" });

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

router.post('/:repoId/ai-commit-message', authenticateJWT, async (req, res) => {
  try {
    const { diff } = req.body;
    if (!diff) return res.status(400).json({ message: "Missing code diff" });

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

export default router;
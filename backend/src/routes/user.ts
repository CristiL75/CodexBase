import express from "express";
import { authenticateJWT } from "./auth"; // sau importă corect dacă e în altă parte
import { User } from "../models/User";

const router = express.Router();

// GET /user/profile - returnează datele și statisticile userului logat
router.get("/profile", authenticateJWT, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-passwordHash -twoFASecret -jwtToken");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
      bio: user.bio || "",
      roles: user.roles || [],
      commits: user.commits || 0,
      repositories: user.repositories || 0,
      lastCommitAt: user.lastCommitAt || null,
      createdAt: user.createdAt || null,
      followers: Array.isArray(user.followers) ? user.followers.length : 0,
      following: Array.isArray(user.following) ? user.following.length : 0,
      starred: Array.isArray(user.starredRepositories) ? user.starredRepositories.length : 0,
      dailyCommitLimit: user.dailyCommitLimit || 0,
      is2FAEnabled: user.is2FAEnabled || false,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /user/find
// POST /user/find - caută utilizatori după email sau username (returnează listă)
router.post('/find', authenticateJWT, async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.length < 2) {
    return res.status(400).json({ message: "Query too short" });
  }
  // Caută utilizatori cu email sau username care conțin query (case-insensitive)
  const users = await User.find({
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { username: { $regex: query, $options: 'i' } }
    ]
  }).select('_id name email username avatar');
  if (!users.length) return res.status(404).json({ message: "No users found" });
  res.json({ users });
});
export default router;
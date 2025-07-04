import express from "express";
import { authenticateJWT } from "./auth"; // sau importă corect dacă e în altă parte
import { User } from "../models/User";
import { Repository } from '../models/Repository';
import { FollowNotification } from "../models/FollowNotification";
import { Commit } from "../models/Commit";
import mongoose from "mongoose";

const router = express.Router();

// GET /user/profile - returnează datele și statisticile userului logat
router.get('/profile', authenticateJWT, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Numără repo-urile unde userul este owner
    const repoCount = await Repository.countDocuments({ owner: user._id });

    // Adaugă _id în răspuns!
    res.json({
      _id: user._id, // <-- adaugă această linie!
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      roles: user.roles,
      is2FAEnabled: user.is2FAEnabled,
      bio: user.bio,
      followers: user.followers.length,
      following: user.following.length,
      starred: user.starredRepositories.length,
      createdAt: user.createdAt,
      lastCommitAt: user.lastCommitAt,
      commits: user.commits,
      dailyCommitLimit: user.dailyCommitLimit,
      repositories: repoCount
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});
router.get('/:userId/activity-calendar', authenticateJWT, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const activity = await Commit.aggregate([
      { $match: { author: userId } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(activity.map(a => ({ date: a._id, count: a.count })));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});
router.post('/find', authenticateJWT, async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.length < 2) {
    return res.status(400).json({ message: "Query too short" });
  }

  const users = await User.find({
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { username: { $regex: query, $options: 'i' } }
    ]
  }).select('_id name email username avatar');
  if (!users.length) return res.status(404).json({ message: "No users found" });
  res.json({ users });
});

router.get('/my-follows', authenticateJWT, async (req: any, res) => {
  console.log("Am intrat în /user/my-follows cu user id:", req.user.id);
  try {
    const notifications = await FollowNotification.find({ to: req.user.id })
      .sort({ createdAt: -1 })
      .populate('from', '_id name email avatar');
    res.json({ notifications });
  } catch (err) {
    console.error("Eroare la /user/my-follows:", err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    // Numără repo-urile unde userul este owner
    const repoCount = await Repository.countDocuments({ owner: user._id });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      repositories: repoCount,
      createdAt: user.createdAt,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/:userId/commits', authenticateJWT, async (req, res) => {
  try {
    const commits = await Commit.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('repository', 'name');
    res.json({ commits });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:userId/follow', authenticateJWT, async (req: any, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow) return res.status(404).json({ message: "User not found" });

    // Nu poți da follow la tine
    if (userToFollow._id.equals(req.user.id)) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    // Dacă deja îl urmărești, nu mai adăuga încă o dată
    if (userToFollow.followers.includes(req.user.id)) {
      return res.status(400).json({ message: "Already following" });
    }

    userToFollow.followers.push(req.user.id);
    await userToFollow.save();

    // Adaugă și la following pentru userul logat
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { following: userToFollow._id }
    });

    // Creează notificare de follow
    await FollowNotification.create({
      to: userToFollow._id,
      from: req.user.id
    });

    res.json({ message: "Followed successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/:userId/unfollow', authenticateJWT, async (req: any, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    if (!userToUnfollow) return res.status(404).json({ message: "User not found" });

    // Nu poți da unfollow la tine
    if (userToUnfollow._id.equals(req.user.id)) {
      return res.status(400).json({ message: "You cannot unfollow yourself" });
    }

    // Dacă nu îl urmărești, nu poți da unfollow
    if (!userToUnfollow.followers.includes(req.user.id)) {
      return res.status(400).json({ message: "You are not following this user" });
    }

    userToUnfollow.followers = userToUnfollow.followers.filter((id: any) => id.toString() !== req.user.id);
    await userToUnfollow.save();

    // Scoate și din following pentru userul logat (opțional)
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { following: userToUnfollow._id }
    });

    res.json({ message: "Unfollowed successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/:userId/followers', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', '_id name email avatar');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ followers: user.followers });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/:userId/following', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', '_id name email avatar');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ following: user.following });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
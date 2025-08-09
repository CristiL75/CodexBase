import express from "express";
import { authenticateJWT } from "./auth";
import { User } from "../models/User";
import { Repository } from '../models/Repository';
import { FollowNotification } from "../models/FollowNotification";
import { Commit } from "../models/Commit";
import { Invitation } from "../models/Invitation"; // 👈 ADAUGĂ DACĂ NU EXISTĂ
import { OrgInvitation } from "../models/OrgInvitation"; // 👈 ADAUGĂ DACĂ NU EXISTĂ
import mongoose from "mongoose";


const router = express.Router();

// GET /user/profile - returnează datele și statisticile userului logat
router.get('/profile', authenticateJWT, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Calculează contoarele reale direct din baza de date
    const repoCount = await Repository.countDocuments({ owner: user._id });
    const commitCount = await Commit.countDocuments({ author: user._id });
    const lastCommit = await Commit.findOne({ author: user._id })
      .sort({ createdAt: -1 })
      .select('createdAt');

    console.log(`🔄 [PROFILE] User ${user.email} - Current: repos=${user.repositories}, commits=${user.commits}`);
    console.log(`🔄 [PROFILE] Real counts: repos=${repoCount}, commits=${commitCount}`);

    // Actualizează user-ul cu contoarele corecte dacă sunt diferite
    if (user.repositories !== repoCount || user.commits !== commitCount) {
      console.log(`🔄 [PROFILE] UPDATING counters for user ${user.email}: repos ${user.repositories} -> ${repoCount}, commits ${user.commits} -> ${commitCount}`);
      
      try {
        const updateResult = await User.findByIdAndUpdate(user._id, {
          repositories: repoCount,
          commits: commitCount,
          lastCommitAt: lastCommit?.createdAt || user.lastCommitAt
        }, { new: true });
        console.log(`🔄 [PROFILE] Update successful. New values: repos=${updateResult?.repositories}, commits=${updateResult?.commits}`);
        
        user.repositories = repoCount;
        user.commits = commitCount;
        if (lastCommit?.createdAt) {
          user.lastCommitAt = lastCommit.createdAt;
        }
      } catch (updateError) {
        console.error(`🔄 [PROFILE] Update failed:`, updateError);
      }
    } else {
      console.log(`🔄 [PROFILE] Counters are already correct, no update needed`);
    }

    res.json({
      _id: user._id,
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
      repositories: user.repositories
    });
  } catch (error) {
    console.error('Error in profile route:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update About Me (bio) for current user
router.patch('/profile', authenticateJWT, async (req: any, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bio },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      _id: user._id,
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
      repositories: await Repository.countDocuments({ owner: user._id })
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Force update counters for current user
router.post('/force-update-counters', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔄 [FORCE-UPDATE] Starting forced update for user ${userId}`);

    // Calculează contoarele reale
    const repoCount = await Repository.countDocuments({ owner: userId });
    const commitCount = await Commit.countDocuments({ author: userId });
    
    console.log(`🔄 [FORCE-UPDATE] Real counts: repos=${repoCount}, commits=${commitCount}`);

    // Actualizează forțat
    const updateResult = await User.findByIdAndUpdate(userId, {
      repositories: repoCount,
      commits: commitCount
    }, { new: true });

    console.log(`🔄 [FORCE-UPDATE] Update completed. New values: repos=${updateResult?.repositories}, commits=${updateResult?.commits}`);

    res.json({ 
      message: "Counters force updated", 
      repositories: updateResult?.repositories,
      commits: updateResult?.commits 
    });
  } catch (error) {
    console.error('🔄 [FORCE-UPDATE] Error:', error);
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
    res.status(400).json({ message: "Query too short" });
    return;
  }

  const users = await User.find({
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { username: { $regex: query, $options: 'i' } }
    ]
  }).select('_id name email username avatar');
  if (!users.length) {
    res.status(404).json({ message: "No users found" });
    return;
  }
  res.json({ users });
});

router.get('/my-follows', authenticateJWT, async (req: any, res) => {
  try {
    const notifications = await FollowNotification.find({ to: req.user.id })
      .sort({ createdAt: -1 })
      .populate('from', '_id name email avatar');
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

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

// Adaugă această rută în fișierul user.ts

router.delete('/follow-notification/:notificationId', authenticateJWT, async (req: any, res: any): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    // Verifică că notificația aparține user-ului
    const notification = await FollowNotification.findOne({ 
      _id: notificationId, 
      to: userId 
    });
    
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    await FollowNotification.findByIdAndDelete(notificationId);
    
    console.log(`Follow notification ${notificationId} deleted for user ${userId}`);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error('Error deleting follow notification:', error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/mark-all-notifications-read', authenticateJWT, async (req: any, res: any): Promise<void> => {
  try {
    const userId = req.user.id;
    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    console.log(`Starting to delete all notifications for user ${userId}`);

    // Șterge DOAR follow notifications (invitațiile se gestionează separat)
    const followResult = await FollowNotification.deleteMany({ to: userId });
    console.log(`Deleted ${followResult.deletedCount} follow notifications`);

    // 👈 COMENTEAZĂ INVITAȚIILE PÂNĂ CÂND MODELELE SUNT IMPLEMENTATE CORECT
    try {
      // Repository invitations (le declină automat doar dacă modelul există)
      if (Invitation) {
        const repoResult = await Invitation.updateMany(
          { user: userId, status: "pending" }, 
          { status: "declined" }
        );
        console.log(`Declined ${repoResult.modifiedCount} repo invitations`);
      }
    } catch (err) {
      console.log('Repo invitations model not available:', err);
    }

    try {
      // Organization invitations (le declină automat doar dacă modelul există)
      if (OrgInvitation) {
        const orgResult = await OrgInvitation.updateMany(
          { user: userId, status: "pending" }, 
          { status: "declined" }
        );
        console.log(`Declined ${orgResult.modifiedCount} org invitations`);
      }
    } catch (err) {
      console.log('Org invitations model not available:', err);
    }
    
    console.log(`All available notifications processed for user ${userId}`);
    res.json({ message: "All notifications deleted" });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
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
    if (!userToFollow) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (String(userToFollow._id) === String(req.user.id)) {
      res.status(400).json({ message: "You cannot follow yourself" });
      return;
    }

    if (userToFollow.followers.includes(req.user.id)) {
      res.status(400).json({ message: "Already following" });
      return;
    }

    userToFollow.followers.push(req.user.id);
    await userToFollow.save();

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { following: userToFollow._id }
    });

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
    if (!userToUnfollow) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (String(userToUnfollow._id) === String(req.user.id)) {
      res.status(400).json({ message: "You cannot unfollow yourself" });
      return;
    }

    if (!userToUnfollow.followers.includes(req.user.id)) {
      res.status(400).json({ message: "You are not following this user" });
      return;
    }

    userToUnfollow.followers = userToUnfollow.followers.filter((id: any) => id.toString() !== req.user.id);
    await userToUnfollow.save();

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
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ followers: user.followers });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/:userId/following', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', '_id name email avatar');
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ following: user.following });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:userId/activity", authenticateJWT, async (req, res) => {
  try {
    const userId = req.params.userId;
    const since = new Date();
    since.setDate(since.getDate() - 13);
    const commits = await Commit.find({
      author: userId,
      createdAt: { $gte: since }
    }).sort({ createdAt: -1 }).lean();

    const repoIds = [...new Set(commits.map(c => c.repository.toString()))];
    const recentRepos = await Repository.find({
      _id: { $in: repoIds },
      isPrivate: false
    }).limit(3).lean();

    res.json({ commits, recentRepos });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Rută pentru a sincroniza contoarele pentru toți userii (admin only sau debug)
router.post('/sync-counters', authenticateJWT, async (req: any, res) => {
  try {
    console.log('🔄 [SYNC] Starting user counters synchronization...');
    
    const users = await User.find({});
    console.log(`🔄 [SYNC] Found ${users.length} users to sync`);
    
    for (const user of users) {
      // Calculează numărul real de repositories
      const repoCount = await Repository.countDocuments({ owner: user._id });
      
      // Calculează numărul real de commits
      const commitCount = await Commit.countDocuments({ author: user._id });
      
      // Găsește ultimul commit
      const lastCommit = await Commit.findOne({ author: user._id })
        .sort({ createdAt: -1 })
        .select('createdAt');
      
      // Actualizează user-ul
      await User.findByIdAndUpdate(user._id, {
        repositories: repoCount,
        commits: commitCount,
        lastCommitAt: lastCommit?.createdAt || user.lastCommitAt
      });
      
      console.log(`🔄 [SYNC] Updated user ${user.email}: repos=${repoCount}, commits=${commitCount}`);
    }
    
    console.log('✅ [SYNC] Synchronization completed');
    res.json({ 
      message: 'Counters synchronized successfully',
      usersUpdated: users.length 
    });
  } catch (error) {
    console.error('❌ [SYNC] Error:', error);
    res.status(500).json({ message: "Server error during synchronization" });
  }
});

export default router;
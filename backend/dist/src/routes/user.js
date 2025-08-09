"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("./auth");
const User_1 = require("../models/User");
const Repository_1 = require("../models/Repository");
const FollowNotification_1 = require("../models/FollowNotification");
const Commit_1 = require("../models/Commit");
const Invitation_1 = require("../models/Invitation"); // 👈 ADAUGĂ DACĂ NU EXISTĂ
const OrgInvitation_1 = require("../models/OrgInvitation"); // 👈 ADAUGĂ DACĂ NU EXISTĂ
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// GET /user/profile - returnează datele și statisticile userului logat
router.get('/profile', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const repoCount = yield Repository_1.Repository.countDocuments({ owner: user._id });
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
            repositories: repoCount
        });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Update About Me (bio) for current user
router.patch('/profile', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bio } = req.body;
        const user = yield User_1.User.findByIdAndUpdate(req.user.id, { bio }, { new: true });
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
            repositories: yield Repository_1.Repository.countDocuments({ owner: user._id })
        });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get('/:userId/activity-calendar', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.params.userId);
        const activity = yield Commit_1.Commit.aggregate([
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
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.post('/find', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.length < 2) {
        res.status(400).json({ message: "Query too short" });
        return;
    }
    const users = yield User_1.User.find({
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
}));
router.get('/my-follows', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notifications = yield FollowNotification_1.FollowNotification.find({ to: req.user.id })
            .sort({ createdAt: -1 })
            .populate('from', '_id name email avatar');
        res.json({ notifications });
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get('/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.params.userId).select('-password');
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const repoCount = yield Repository_1.Repository.countDocuments({ owner: user._id });
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
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
// Adaugă această rută în fișierul user.ts
router.delete('/follow-notification/:notificationId', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        // Verifică că notificația aparține user-ului
        const notification = yield FollowNotification_1.FollowNotification.findOne({
            _id: notificationId,
            to: userId
        });
        if (!notification) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }
        yield FollowNotification_1.FollowNotification.findByIdAndDelete(notificationId);
        console.log(`Follow notification ${notificationId} deleted for user ${userId}`);
        res.json({ message: "Notification deleted" });
    }
    catch (error) {
        console.error('Error deleting follow notification:', error);
        res.status(500).json({ message: "Server error" });
    }
}));
router.post('/mark-all-notifications-read', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        if (!userId) {
            res.status(401).json({ message: "User not authenticated" });
            return;
        }
        console.log(`Starting to delete all notifications for user ${userId}`);
        // Șterge DOAR follow notifications (invitațiile se gestionează separat)
        const followResult = yield FollowNotification_1.FollowNotification.deleteMany({ to: userId });
        console.log(`Deleted ${followResult.deletedCount} follow notifications`);
        // 👈 COMENTEAZĂ INVITAȚIILE PÂNĂ CÂND MODELELE SUNT IMPLEMENTATE CORECT
        try {
            // Repository invitations (le declină automat doar dacă modelul există)
            if (Invitation_1.Invitation) {
                const repoResult = yield Invitation_1.Invitation.updateMany({ user: userId, status: "pending" }, { status: "declined" });
                console.log(`Declined ${repoResult.modifiedCount} repo invitations`);
            }
        }
        catch (err) {
            console.log('Repo invitations model not available:', err);
        }
        try {
            // Organization invitations (le declină automat doar dacă modelul există)
            if (OrgInvitation_1.OrgInvitation) {
                const orgResult = yield OrgInvitation_1.OrgInvitation.updateMany({ user: userId, status: "pending" }, { status: "declined" });
                console.log(`Declined ${orgResult.modifiedCount} org invitations`);
            }
        }
        catch (err) {
            console.log('Org invitations model not available:', err);
        }
        console.log(`All available notifications processed for user ${userId}`);
        res.json({ message: "All notifications deleted" });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: "Server error" });
    }
}));
router.get('/:userId/commits', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const commits = yield Commit_1.Commit.find({ author: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('repository', 'name');
        res.json({ commits });
    }
    catch (_a) {
        res.status(500).json({ message: 'Server error' });
    }
}));
router.post('/:userId/follow', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userToFollow = yield User_1.User.findById(req.params.userId);
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
        yield userToFollow.save();
        yield User_1.User.findByIdAndUpdate(req.user.id, {
            $addToSet: { following: userToFollow._id }
        });
        yield FollowNotification_1.FollowNotification.create({
            to: userToFollow._id,
            from: req.user.id
        });
        res.json({ message: "Followed successfully" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.post('/:userId/unfollow', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userToUnfollow = yield User_1.User.findById(req.params.userId);
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
        userToUnfollow.followers = userToUnfollow.followers.filter((id) => id.toString() !== req.user.id);
        yield userToUnfollow.save();
        yield User_1.User.findByIdAndUpdate(req.user.id, {
            $pull: { following: userToUnfollow._id }
        });
        res.json({ message: "Unfollowed successfully" });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get('/:userId/followers', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.params.userId)
            .populate('followers', '_id name email avatar');
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ followers: user.followers });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get('/:userId/following', auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.params.userId)
            .populate('following', '_id name email avatar');
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ following: user.following });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
router.get("/:userId/activity", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        const since = new Date();
        since.setDate(since.getDate() - 13);
        const commits = yield Commit_1.Commit.find({
            author: userId,
            createdAt: { $gte: since }
        }).sort({ createdAt: -1 }).lean();
        const repoIds = [...new Set(commits.map(c => c.repository.toString()))];
        const recentRepos = yield Repository_1.Repository.find({
            _id: { $in: repoIds },
            isPrivate: false
        }).limit(3).lean();
        res.json({ commits, recentRepos });
    }
    catch (_a) {
        res.status(500).json({ message: "Server error" });
    }
}));
exports.default = router;

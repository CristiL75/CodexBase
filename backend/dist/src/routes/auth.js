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
exports.authenticateJWToptional = exports.authenticateJWT = void 0;
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const crypto_1 = __importDefault(require("crypto"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const tokenManager_1 = require("../utils/tokenManager");
const router = express_1.default.Router();
// --- GOOGLE OAUTH ---
router.get("/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport_1.default.authenticate("google", { session: false, failureRedirect: "/login" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    // Generează noi tokens
    const tokens = (0, tokenManager_1.generateTokenPair)(user);
    // Actualizează utilizatorul cu noile tokens
    yield User_1.User.findByIdAndUpdate(user._id, {
        jwtToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: (0, tokenManager_1.getRefreshTokenExpiry)()
    });
    // Redirecționează cu access token (refresh token va fi trimis separat)
    res.redirect(`http://localhost:5173/auth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
}));
// --- SIGNUP CLASIC ---
router.post("/signup", [
    (0, express_validator_1.body)("email").isEmail(),
    (0, express_validator_1.body)("name").notEmpty(),
    (0, express_validator_1.body)("password").isLength({ min: 6 }),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, name, password } = req.body;
    try {
        const existingUser = yield User_1.User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User with this email already exists" });
            return;
        }
        const passwordHash = yield bcrypt_1.default.hash(password, 10);
        const newUser = yield User_1.User.create({
            email,
            name,
            passwordHash,
            authMethod: "local",
            is2FAEnabled: false,
        });
        const tempToken = jsonwebtoken_1.default.sign({ id: newUser._id, email: newUser.email, is2FAEnabled: false, twoFAPending: true }, process.env.JWT_SECRET, { expiresIn: "14h" });
        newUser.jwtToken = tempToken;
        yield newUser.save();
        res.json({ require2FASetup: true, tempToken });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
// --- LOGIN CLASIC ---
router.post("/login", [(0, express_validator_1.body)("email").isEmail(), (0, express_validator_1.body)("password").notEmpty()], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, password } = req.body;
    try {
        const user = yield User_1.User.findOne({ email, authMethod: "local" });
        if (!user) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const isMatch = yield bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        if (user.is2FAEnabled) {
            // Pentru 2FA, folosim încă tokens temporare
            const tempToken = jsonwebtoken_1.default.sign({ id: user._id, email: user.email, is2FAEnabled: true, twoFAPending: true }, process.env.JWT_SECRET, { expiresIn: "10m" });
            res.json({ require2FA: true, tempToken });
            return;
        }
        // Pentru utilizatori fără 2FA, generăm tokens complete
        const tokens = (0, tokenManager_1.generateTokenPair)(user);
        // Actualizează utilizatorul cu noile tokens
        yield User_1.User.findByIdAndUpdate(user._id, {
            jwtToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            refreshTokenExpiresAt: (0, tokenManager_1.getRefreshTokenExpiry)()
        });
        res.json((0, tokenManager_1.createAuthResponse)(user, tokens));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
// --- MIDDLEWARE JWT ---
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = (0, tokenManager_1.extractTokenFromHeader)(authHeader);
    console.log(`[Auth] Request to ${req.path} - Headers: ${JSON.stringify(req.headers.authorization ? 'Bearer ***' : 'None')}`);
    if (!token) {
        console.log(`[Auth] No token provided for request to ${req.path}`);
        res.status(401).json({
            message: "No token provided",
            code: "NO_TOKEN"
        });
        return;
    }
    const decoded = (0, tokenManager_1.verifyAccessToken)(token);
    if (!decoded) {
        console.log(`[Auth] Invalid or expired token for request to ${req.path}. Token: ${token.substring(0, 20)}...`);
        res.status(401).json({
            message: "Invalid or expired token",
            code: "TOKEN_INVALID"
        });
        return;
    }
    console.log(`[Auth] Token verified successfully for user ${decoded.id} on ${req.path}`);
    req.user = decoded;
    next();
};
exports.authenticateJWT = authenticateJWT;
// --- 2FA SETUP ---
router.post("/2fa/setup", exports.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const secret = speakeasy_1.default.generateSecret({
            name: `CodexBase (${user.email})`,
        });
        user.twoFASecret = secret.base32;
        user.is2FAEnabled = false;
        yield user.save();
        const otpauth_url = speakeasy_1.default.otpauthURL({
            secret: secret.base32,
            label: `CodexBase (${user.email})`,
            issuer: 'CodexBase',
            encoding: 'base32'
        });
        const qrCodeUrl = yield qrcode_1.default.toDataURL(otpauth_url);
        res.json({ qrCode: qrCodeUrl, secret: secret.base32 });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate 2FA secret" });
    }
}));
// --- 2FA VERIFY ---
router.post("/2fa/verify", exports.authenticateJWT, (0, express_validator_1.body)("token").isLength({ min: 6, max: 6 }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { token } = req.body;
    try {
        const user = yield User_1.User.findById(req.user.id);
        if (!user || !user.twoFASecret) {
            res.status(400).json({ message: "2FA not setup for this user" });
            return;
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFASecret,
            encoding: "base32",
            token,
            window: 1,
        });
        if (!verified) {
            res.status(400).json({ message: "Invalid 2FA token" });
            return;
        }
        if (!user.is2FAEnabled) {
            user.is2FAEnabled = true;
            yield user.save();
        }
        const tokens = (0, tokenManager_1.generateTokenPair)(user);
        // Actualizează utilizatorul cu noile tokens
        yield User_1.User.findByIdAndUpdate(user._id, {
            jwtToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            refreshTokenExpiresAt: (0, tokenManager_1.getRefreshTokenExpiry)()
        });
        res.json(Object.assign({ success: true, message: "2FA enabled successfully" }, (0, tokenManager_1.createAuthResponse)(user, tokens)));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "2FA verification failed" });
    }
}));
// --- LOGIN 2FA VERIFY ---
router.post("/login/2fa-verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, token } = req.body;
    try {
        const user = yield User_1.User.findOne({ email });
        if (!user || !user.is2FAEnabled || !user.twoFASecret) {
            res.status(400).json({ message: "User not found or 2FA not enabled" });
            return;
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFASecret,
            encoding: "base32",
            token,
            window: 1,
        });
        if (!verified) {
            res.status(400).json({ message: "Invalid 2FA token" });
            return;
        }
        const tokens = (0, tokenManager_1.generateTokenPair)(user);
        // Actualizează utilizatorul cu noile tokens
        yield User_1.User.findByIdAndUpdate(user._id, {
            jwtToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            refreshTokenExpiresAt: (0, tokenManager_1.getRefreshTokenExpiry)()
        });
        res.json((0, tokenManager_1.createAuthResponse)(user, tokens));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}));
// --- 2FA BACKUP CODES ---
router.post("/2fa/generate-backup-codes", exports.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.user.id);
        if (!user || !user.is2FAEnabled) {
            res.status(400).json({ message: "2FA not enabled" });
            return;
        }
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push(crypto_1.default.randomBytes(4).toString("hex"));
        }
        const hashedBackupCodes = backupCodes.map(code => bcrypt_1.default.hashSync(code, 10));
        user.backupCodes = hashedBackupCodes;
        yield user.save();
        res.json({ backupCodes });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate backup codes" });
    }
}));
// --- 2FA DISABLE ---
router.post("/2fa/disable", exports.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = req.body;
        const user = yield User_1.User.findById(req.user.id);
        if (!user) {
            res.status(400).json({ message: "User not found" });
            return;
        }
        if (user.authMethod === "local") {
            const isMatch = yield bcrypt_1.default.compare(password, user.passwordHash);
            if (!isMatch) {
                res.status(400).json({ message: "Invalid password" });
                return;
            }
        }
        user.is2FAEnabled = false;
        user.twoFASecret = undefined;
        user.backupCodes = [];
        yield user.save();
        res.json({ message: "2FA disabled successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to disable 2FA" });
    }
}));
// --- JWT OPTIONAL ---
const authenticateJWToptional = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // @ts-ignore
            req.user = yield User_1.User.findById(decoded.id);
        }
        catch (_a) {
            req.user = undefined;
        }
    }
    else {
        req.user = undefined;
    }
    next();
});
exports.authenticateJWToptional = authenticateJWToptional;
// Refresh token endpoint
router.post("/refresh", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                message: "Refresh token is required",
                code: "REFRESH_TOKEN_REQUIRED"
            });
            return;
        }
        // Găsește utilizatorul cu acest refresh token
        const user = yield User_1.User.findOne({
            refreshToken,
            refreshTokenExpiresAt: { $gt: new Date() }
        });
        if (!user) {
            res.status(401).json({
                message: "Invalid or expired refresh token",
                code: "REFRESH_TOKEN_INVALID"
            });
            return;
        }
        // Generează noi tokens
        const tokens = (0, tokenManager_1.generateTokenPair)(user);
        // Actualizează refresh token-ul în baza de date
        user.refreshToken = tokens.refreshToken;
        user.refreshTokenExpiresAt = (0, tokenManager_1.getRefreshTokenExpiry)();
        user.jwtToken = tokens.accessToken;
        yield user.save();
        res.json((0, tokenManager_1.createAuthResponse)(user, tokens));
    }
    catch (error) {
        console.error('[Auth] Refresh token error:', error);
        res.status(500).json({
            message: "Server error during token refresh",
            code: "REFRESH_ERROR"
        });
    }
}));
// Logout endpoint (invalidează refresh token)
router.post("/logout", exports.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Șterge refresh token-ul și JWT token-ul
        yield User_1.User.findByIdAndUpdate(userId, {
            $unset: {
                refreshToken: 1,
                refreshTokenExpiresAt: 1,
                jwtToken: 1
            }
        });
        res.json({
            message: "Successfully logged out",
            code: "LOGOUT_SUCCESS"
        });
    }
    catch (error) {
        console.error('[Auth] Logout error:', error);
        res.status(500).json({
            message: "Server error during logout",
            code: "LOGOUT_ERROR"
        });
    }
}));
exports.default = router;

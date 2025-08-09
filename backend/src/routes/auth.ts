// --- LOGOUT ---
// (mutat după declarația router)
import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { User } from "../models/User";
import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { 
  generateTokenPair, 
  verifyAccessToken, 
  extractTokenFromHeader, 
  createAuthResponse,
  isRefreshTokenValid,
  getRefreshTokenExpiry
} from "../utils/tokenManager";

const router = express.Router();

// --- GOOGLE OAUTH ---
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req: any, res: Response) => {
    const user = req.user;
    
    // Generează noi tokens
    const tokens = generateTokenPair(user);
    
    // Actualizează utilizatorul cu noile tokens
    await User.findByIdAndUpdate(user._id, { 
      jwtToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: getRefreshTokenExpiry()
    });
    
    // Redirecționează cu access token (refresh token va fi trimis separat)
    res.redirect(`http://localhost:5173/auth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// --- SIGNUP CLASIC ---
router.post(
  "/signup",
  [
    body("email").isEmail(),
    body("name").notEmpty(),
    body("password").isLength({ min: 6 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, name, password } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "User with this email already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        email,
        name,
        passwordHash,
        authMethod: "local",
        is2FAEnabled: false,
      });

      // Generează token clasic pentru user nou
      const token = jwt.sign(
        { id: newUser._id, email: newUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: "14h" }
      );
      newUser.jwtToken = token;
      await newUser.save();
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// --- LOGIN CLASIC ---
router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email, authMethod: "local" });
      if (!user) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash!);
      if (!isMatch) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      if (user.is2FAEnabled) {
        // Pentru 2FA, folosim încă tokens temporare
        const tempToken = jwt.sign(
          { id: user._id, email: user.email, is2FAEnabled: true, twoFAPending: true },
          process.env.JWT_SECRET!,
          { expiresIn: "10m" }
        );
        res.json({ require2FA: true, tempToken });
        return;
      }

      // Pentru utilizatori fără 2FA, generăm tokens complete
      const tokens = generateTokenPair(user);

      // Actualizează utilizatorul cu noile tokens
      await User.findByIdAndUpdate(user._id, { 
        jwtToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: getRefreshTokenExpiry()
      });

      // Setează HttpOnly cookies pentru accessToken și refreshToken
  // Trimite tokenurile direct în răspuns (fără cookies)
  res.json(createAuthResponse(user, tokens));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// --- MIDDLEWARE JWT ---
export const authenticateJWT = (req: any, res: Response, next: NextFunction): void => {
  console.log(`[AUTH] Header Authorization:`, req.headers.authorization);
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    console.log(`[AUTH] Token extras:`, token);
    console.log(`[AUTH] Middleware called for path: ${req.path}, method: ${req.method}`);


  
  console.log(`[Auth] Request to ${req.path} - Headers: ${JSON.stringify(req.headers.authorization ? 'Bearer ***' : 'None')}`);
  
  // Special logging for commit requests
  if (req.path.includes('/commit')) {
    console.log(`🔧 [AUTH] Commit request intercepted for path: ${req.path}`);
    console.log(`🔧 [AUTH] Method: ${req.method}`);
    console.log(`🔧 [AUTH] Token present: ${!!token}`);
  }
  
  if (!token) {
    console.log(`[Auth] No token provided for request to ${req.path}`);
    res.status(401).json({ 
      message: "No token provided", 
      code: "NO_TOKEN" 
    });
    return;
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    console.log(`[Auth] Invalid or expired token for request to ${req.path}. Token: ${token.substring(0, 20)}...`);
    res.status(401).json({ 
      message: "Invalid or expired token", 
      code: "TOKEN_INVALID" 
    });
    return;
  }

  console.log(`[Auth] Token verified successfully for user ${decoded.id} on ${req.path}`);
  
  // Special logging for commit requests
  if (req.path.includes('/commit')) {
    console.log(`🔧 [AUTH] Commit authentication successful, passing to route handler`);
  }
  
  req.user = decoded;
  next();
};

// --- 2FA SETUP ---
router.post("/2fa/setup", authenticateJWT, async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const secret = speakeasy.generateSecret({
      name: `CodexBase (${user.email})`,
    });

    user.twoFASecret = secret.base32;
    user.is2FAEnabled = false;
    await user.save();

    const otpauth_url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `CodexBase (${user.email})`,
      issuer: 'CodexBase',
      encoding: 'base32'
    });

    const qrCodeUrl = await qrcode.toDataURL(otpauth_url);

    res.json({ qrCode: qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate 2FA secret" });
  }
});

// --- 2FA VERIFY ---
router.post(
  "/2fa/verify",
  authenticateJWT,
  body("token").isLength({ min: 6, max: 6 }),
  async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { token } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user || !user.twoFASecret) {
        res.status(400).json({ message: "2FA not setup for this user" });
        return;
      }

      const verified = speakeasy.totp.verify({
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
        await user.save();
      }

      const tokens = generateTokenPair(user);
      
      // Actualizează utilizatorul cu noile tokens
      await User.findByIdAndUpdate(user._id, { 
        jwtToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: getRefreshTokenExpiry()
      });

      res.json({ 
        success: true, 
        message: "2FA enabled successfully", 
        ...createAuthResponse(user, tokens) 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "2FA verification failed" });
    }
  }
);

// --- LOGIN 2FA VERIFY ---
router.post("/login/2fa-verify", async (req: Request, res: Response) => {
  const { email, token } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.is2FAEnabled || !user.twoFASecret) {
      res.status(400).json({ message: "User not found or 2FA not enabled" });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      res.status(400).json({ message: "Invalid 2FA token" });
      return;
    }

    const tokens = generateTokenPair(user);

    // Actualizează utilizatorul cu noile tokens
    await User.findByIdAndUpdate(user._id, { 
      jwtToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: getRefreshTokenExpiry()
    });

    res.json(createAuthResponse(user, tokens));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- 2FA BACKUP CODES ---
router.post("/2fa/generate-backup-codes", authenticateJWT, async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.is2FAEnabled) {
      res.status(400).json({ message: "2FA not enabled" });
      return;
    }

    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex"));
    }

    const hashedBackupCodes = backupCodes.map(code => bcrypt.hashSync(code, 10));
    user.backupCodes = hashedBackupCodes;
    await user.save();

    res.json({ backupCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate backup codes" });
  }
});

// --- 2FA DISABLE ---
router.post("/2fa/disable", authenticateJWT, async (req: any, res: Response) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    if (user.authMethod === "local") {
      const isMatch = await bcrypt.compare(password, user.passwordHash!);
      if (!isMatch) {
        res.status(400).json({ message: "Invalid password" });
        return;
      }
    }

    user.is2FAEnabled = false;
    user.twoFASecret = undefined;
    user.backupCodes = [];
    await user.save();

    res.json({ message: "2FA disabled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to disable 2FA" });
  }
});

// --- JWT OPTIONAL ---
export const authenticateJWToptional = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      // @ts-ignore
      req.user = await User.findById((decoded as any).id);
    } catch {
      req.user = undefined;
    }
  } else {
    req.user = undefined;
  }
  next();
};

// Refresh token endpoint
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
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
    const user = await User.findOne({ 
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
    const tokens = generateTokenPair(user);
    
    // Actualizează refresh token-ul în baza de date
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiresAt = getRefreshTokenExpiry();
    user.jwtToken = tokens.accessToken;
    await user.save();

    res.json(createAuthResponse(user, tokens));
  } catch (error) {
    console.error('[Auth] Refresh token error:', error);
    res.status(500).json({ 
      message: "Server error during token refresh",
      code: "REFRESH_ERROR" 
    });
  }
});

// Logout endpoint (invalidează refresh token)
router.post("/logout", authenticateJWT, async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    
    // Șterge refresh token-ul și JWT token-ul
    await User.findByIdAndUpdate(userId, {
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
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ 
      message: "Server error during logout",
      code: "LOGOUT_ERROR" 
    });
  }
});

export default router;
import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { User } from "../models/User";
import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const router = express.Router();

// --- GOOGLE OAUTH ---
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req: any, res: Response) => {
    const user = req.user;
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        is2FAEnabled: user.is2FAEnabled,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    await User.findByIdAndUpdate(user._id, { jwtToken: token });
    res.redirect(`http://localhost:5173/auth/success?token=${token}`);
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

      const tempToken = jwt.sign(
        { id: newUser._id, email: newUser.email, is2FAEnabled: false, twoFAPending: true },
        process.env.JWT_SECRET!,
        { expiresIn: "14h" }
      );

      newUser.jwtToken = tempToken;
      await newUser.save();

      res.json({ require2FASetup: true, tempToken });
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
        const tempToken = jwt.sign(
          { id: user._id, email: user.email, is2FAEnabled: true, twoFAPending: true },
          process.env.JWT_SECRET!,
          { expiresIn: "14h" }
        );
        res.json({ require2FA: true, tempToken });
        return;
      }

      const tempToken = jwt.sign(
        { id: user._id, email: user.email, is2FAEnabled: false, twoFAPending: true },
        process.env.JWT_SECRET!,
        { expiresIn: "10m" }
      );
      res.json({ require2FASetup: true, tempToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// --- MIDDLEWARE JWT ---
export const authenticateJWT = (req: any, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: "Missing auth token" });
    return;
  }
  if (!authHeader.startsWith("Bearer ")) {
    console.log('Invalid auth header:', authHeader);
    res.status(401).json({ message: "Invalid auth header" });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Invalid auth header" });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      console.error('JWT verify error:', err);
      res.status(403).json({ message: "Invalid token" });
      return;
    }
    req.user = user;
    next();
  });
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

      const jwtToken = jwt.sign(
        { id: user._id, email: user.email, is2FAEnabled: true },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );
      user.jwtToken = jwtToken;
      await user.save();

      res.json({ success: true, message: "2FA enabled successfully", token: jwtToken });
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

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, is2FAEnabled: true },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    user.jwtToken = jwtToken;
    await user.save();

    res.json({ token: jwtToken });
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

export default router;
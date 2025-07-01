import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { User } from "../models/User";
import crypto from 'crypto';

const router = express.Router();

// --- GOOGLE OAUTH ---

// 1. Redirect to Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// 2. Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req: any, res) => {
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

    // Salvează tokenul în DB (opțional)
    await User.findByIdAndUpdate(user._id, { jwtToken: token });

    // Redirect cu token în URL (frontend îl va extrage)
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, name, password } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "User with this email already exists" });

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        email,
        name,
        passwordHash,
        authMethod: "local",
      });

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, is2FAEnabled: newUser.is2FAEnabled },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email, authMethod: "local" });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.passwordHash!);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign(
        { id: user._id, email: user.email, is2FAEnabled: user.is2FAEnabled },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      user.jwtToken = token;
      await user.save();

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// --- MIDDLEWARE simplu pentru validarea tokenului JWT (pentru rute protejate) ---
export const authenticateJWT = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Missing auth token" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid auth header" });

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};


import speakeasy from "speakeasy";
import qrcode from "qrcode";

// Generare secret + QR code pentru 2FA setup
router.post("/2fa/setup", authenticateJWT, async (req: any, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `CodexBase (${req.user.email})`,
    });

    // Salvează secret temporar în DB, fără activa 2FA încă
    await User.findByIdAndUpdate(req.user.id, { twoFASecret: secret.base32 });

    // Generează QR code data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate 2FA secret" });
  }
});


// Confirmare cod 2FA + activare
router.post(
  "/2fa/verify",
  authenticateJWT,
  body("token").isLength({ min: 6, max: 6 }),
  async (req: any, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user || !user.twoFASecret)
        return res.status(400).json({ message: "2FA not setup for this user" });

      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: "base32",
        token,
        window: 1,
      });

      if (!verified) return res.status(400).json({ message: "Invalid 2FA token" });

      // Activează 2FA definitiv
      user.is2FAEnabled = true;
      await user.save();

      res.json({ message: "2FA enabled successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "2FA verification failed" });
    }
  }
);

// Adaugă un endpoint pentru login în doi pași când 2FA este activat
router.post("/login/2fa-verify", async (req, res) => {
  const { email, token } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user || !user.is2FAEnabled) 
      return res.status(400).json({ message: "User not found or 2FA not enabled" });
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
      window: 1,
    });
    
    if (!verified) return res.status(400).json({ message: "Invalid 2FA token" });
    
    // Generează tokenul JWT doar după verificarea 2FA
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

router.post("/2fa/generate-backup-codes", authenticateJWT, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.is2FAEnabled) 
      return res.status(400).json({ message: "2FA not enabled" });
    
    // Generează 10 coduri de recuperare unice
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex"));
    }
    
    // Hash codurile înainte de a le stoca
    const hashedBackupCodes = backupCodes.map(code => bcrypt.hashSync(code, 10));
    
    user.backupCodes = hashedBackupCodes;
    await user.save();
    
    // Returnează codurile în text clar pentru a fi salvate de utilizator
    res.json({ backupCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate backup codes" });
  }
});


router.post("/2fa/disable", authenticateJWT, async (req: any, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) 
      return res.status(400).json({ message: "User not found" });
      
    if (user.authMethod === "local") {
      // Verifică parola pentru autentificarea locală
      const isMatch = await bcrypt.compare(password, user.passwordHash!);
      if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    }
    
    // Dezactivează 2FA și șterge secretul
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

export default router;

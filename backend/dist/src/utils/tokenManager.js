"use strict";
/**
 * Utilități pentru gestionarea JWT tokens și refresh tokens
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.generateTokenPair = generateTokenPair;
exports.verifyAccessToken = verifyAccessToken;
exports.getRefreshTokenExpiry = getRefreshTokenExpiry;
exports.isRefreshTokenValid = isRefreshTokenValid;
exports.extractTokenFromHeader = extractTokenFromHeader;
exports.createAuthResponse = createAuthResponse;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generează un access token JWT
 */
function generateAccessToken(user) {
    const payload = {
        id: user._id.toString(),
        email: user.email,
        is2FAEnabled: user.is2FAEnabled
    };
    return jsonwebtoken_1.default.sign(Object.assign(Object.assign({}, payload), { type: 'access' }), process.env.JWT_SECRET, { expiresIn: '15m' } // Token de acces expiră în 15 minute
    );
}
/**
 * Generează un refresh token securizat
 */
function generateRefreshToken() {
    return crypto_1.default.randomBytes(64).toString('hex');
}
/**
 * Generează o pereche de tokens (access + refresh)
 */
function generateTokenPair(user) {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minute în secunde
        refreshExpiresIn: 7 * 24 * 60 * 60 // 7 zile în secunde
    };
}
/**
 * Verifică și decodează un access token
 */
function verifyAccessToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'access') {
            return null;
        }
        return decoded;
    }
    catch (error) {
        return null;
    }
}
/**
 * Calculează data de expirare pentru refresh token
 */
function getRefreshTokenExpiry() {
    const now = new Date();
    return new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 zile
}
/**
 * Verifică dacă un refresh token este valid (nu expirat)
 */
function isRefreshTokenValid(expiresAt) {
    return new Date() < expiresAt;
}
/**
 * Extrage token-ul din header-ul Authorization
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
}
/**
 * Creează un răspuns standard pentru autentificare
 */
function createAuthResponse(user, tokens) {
    return {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            is2FAEnabled: user.is2FAEnabled,
            authMethod: user.authMethod,
            roles: user.roles,
            createdAt: user.createdAt
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer'
    };
}

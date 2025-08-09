/**
 * Utilități pentru gestionarea JWT tokens și refresh tokens
 */


import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUser } from '../models/User';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface TokenPayload {
  id: string;
  email: string;
  is2FAEnabled: boolean;
  type: 'access' | 'refresh';
}

/**
 * Generează un access token JWT
 */
export function generateAccessToken(user: IUser): string {
  const payload: Omit<TokenPayload, 'type'> = {
    id: (user._id as any).toString(),
    email: user.email,
    is2FAEnabled: user.is2FAEnabled
  };

  return jwt.sign(
    { ...payload, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } // Token de acces expiră în 15 minute
  );
}

/**
 * Generează un refresh token securizat
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Generează o pereche de tokens (access + refresh)
 */
export function generateTokenPair(user: IUser): TokenPair {
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
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Calculează data de expirare pentru refresh token
 */
export function getRefreshTokenExpiry(): Date {
  const now = new Date();
  return new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 zile
}

/**
 * Verifică dacă un refresh token este valid (nu expirat)
 */
export function isRefreshTokenValid(expiresAt: Date): boolean {
  return new Date() < expiresAt;
}

/**
 * Extrage token-ul din header-ul Authorization
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

/**
 * Creează un răspuns standard pentru autentificare
 */
export function createAuthResponse(user: IUser, tokens: TokenPair) {
  return {
    user: {
      id: (user._id as any),
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
    token: tokens.accessToken, // alias pentru frontend
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer'
  };
}

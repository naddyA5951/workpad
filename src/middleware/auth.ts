import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getUserByUid, getOrCreateUser } from '../db/users.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'notecraft-academic-secure-hmac-key-2026';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  collegeName: string;
  collegeIdNumber: string;
  collegeIdStatus: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Secure password hashing using Node.js scrypt with 16-byte random salt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Create HMAC-SHA256 signed session token for Email/Password auth
export function createSessionToken(uid: string, email: string): string {
  const payload = JSON.stringify({
    uid,
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `nc_sess.${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): { uid: string; email: string } | null {
  if (!token.startsWith('nc_sess.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, base64Payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (typeof data.exp !== 'number' || Date.now() > data.exp) {
      return null;
    }
    return { uid: data.uid, email: data.email };
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    // 1. Check if token is a server-signed Email/Password session token
    if (token.startsWith('nc_sess.')) {
      const verified = verifySessionToken(token);
      if (!verified) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
      }
      const dbUser = await getUserByUid(verified.uid);
      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized: User account not found' });
      }
      req.user = {
        id: dbUser.id,
        uid: dbUser.uid,
        email: dbUser.email,
        fullName: dbUser.fullName,
        phone: dbUser.phone,
        collegeName: dbUser.collegeName,
        collegeIdNumber: dbUser.collegeIdNumber,
        collegeIdStatus: dbUser.collegeIdStatus,
        role: dbUser.role,
      };
      return next();
    }

    // 2. Otherwise verify as Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@firebase.user`,
      decodedToken.name || 'College Student'
    );
    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      fullName: dbUser.fullName,
      phone: dbUser.phone,
      collegeName: dbUser.collegeName,
      collegeIdNumber: dbUser.collegeIdNumber,
      collegeIdStatus: dbUser.collegeIdStatus,
      role: dbUser.role,
    };
    next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden: Administrator role required to perform this action',
    });
  }
  next();
};

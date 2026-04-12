// lib/auth.ts
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  user_id: number;
  email: string;
  role: 'customer' | 'admin' | 'worker';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.split(' ')[1];
}

export function authenticate(req: NextRequest): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest, ...roles: string[]): { user: JwtPayload } | { error: Response } {
  const user = authenticate(req);
  if (!user) {
    return { error: Response.json({ error: '인증 토큰이 없습니다.' }, { status: 401 }) };
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    return { error: Response.json({ error: '접근 권한이 없습니다.' }, { status: 403 }) };
  }
  return { user };
}

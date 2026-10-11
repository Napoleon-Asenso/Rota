import jwt from 'jsonwebtoken';
import { AuthUserPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_super_secret_jwt_key_rota_2026_minimum_32_bytes_long';
const ACCESS_TOKEN_EXPIRY = '15m';

export function signAccessToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): AuthUserPayload {
  return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
}

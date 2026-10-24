import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types';
import { verifyAccessToken } from '../utils/jwt';

/**
 * authenticate (authMiddleware)
 * Validates Bearer access token, extracts userId, teamId, role, and attaches to req.user.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header.',
        details: null
      }
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token is expired or invalid.',
        details: null
      }
    });
  }
}

// Alias for backwards compatibility
export const authMiddleware = authenticate;

/**
 * enforceTenant (tenantContextMiddleware)
 * Verifies that teamId is present and attaches tenant context to req.tenant.
 * Ensures queries filter strictly by tenant.
 */
export function enforceTenant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required for tenant context.',
        details: null
      }
    });
    return;
  }

  const teamId = (req.params.teamId as string) || (req.body.teamId as string) || user.teamId || 'team-default-1';
  const role: Role = (user.role as Role) || 'STAFF';

  req.tenant = {
    teamId,
    role,
    userId: user.sub
  };

  next();
}

// Alias for backwards compatibility
export const tenantContextMiddleware = enforceTenant;

/**
 * requireRole
 * Checks req.user.role (or req.tenant.role). Returns HTTP 403 Forbidden if unauthorized.
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = (req.user?.role || req.tenant?.role) as Role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_INSUFFICIENT_ROLE',
          message: 'Insufficient permissions.',
          details: null
        }
      });
      return;
    }
    next();
  };
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types';
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.', details: null }
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid.', details: null }
    });
  }
}

export function tenantContextMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  const teamId = (req.params.teamId as string) || (req.body.teamId as string) || user?.teamId || 'team-default-1';

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required for tenant context.', details: null }
    });
    return;
  }

  const role: Role = user.role || 'STAFF';

  req.tenant = {
    teamId,
    role,
    userId: user.sub
  };

  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.tenant?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_INSUFFICIENT_ROLE', message: 'Insufficient role permissions for this operation.', details: null }
      });
      return;
    }
    next();
  };
}

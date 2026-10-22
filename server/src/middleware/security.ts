import { Request, Response, NextFunction } from 'express';

/**
 * ============================================================================
 * Security Middlewares: URL Password Prevention & Log Sanitization
 * ============================================================================
 * 
 * Rules Enforced:
 * 1. NEVER put a password in the URL (query parameter or URL path).
 * 2. NEVER log a password in terminal, console, or file logs.
 */

const PASSWORD_PARAM_REGEX = /(?:^|[?&#])(?:password|pwd|pass|secret)=/i;

/**
 * Middleware that strictly forbids passwords in URLs.
 * Rejects with HTTP 400 if a client attempts to transmit a password via GET query string or URL.
 */
export function preventPasswordInUrl(req: Request, res: Response, next: NextFunction): void {
  // Check if query string contains password keys
  const queryKeys = Object.keys(req.query || {});
  const hasPasswordInQuery = queryKeys.some((k) =>
    /^(password|pwd|pass|user_password|new_password)$/i.test(k)
  );

  // Check raw URL string
  const hasPasswordInUrl = req.url && PASSWORD_PARAM_REGEX.test(req.url);

  if (hasPasswordInQuery || hasPasswordInUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: 'FORBIDDEN_PASSWORD_IN_URL',
        message: 'Security Violation: Passwords must NEVER be passed in the URL or query parameters. Always send passwords securely in the request body.',
        details: null
      }
    });
    return;
  }

  next();
}

/**
 * Strips/redacts sensitive query strings from URL before passing to loggers.
 */
export function sanitizeUrlForLogging(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl.replace(
    /([?&](?:password|pwd|pass|secret|token|refreshToken)=)[^&]*/gi,
    '$1[REDACTED]'
  );
}

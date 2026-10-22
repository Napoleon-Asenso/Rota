/// <reference path="./types/declarations.d.ts" />
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './db/prisma';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware, tenantContextMiddleware } from './middleware/auth';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
  logoutAllHandler,
  logoutAllHandler as revokeAllHandler,
  forgotPasswordHandler,
  passwordRequirementsHandler
} from './controllers/auth.controller';
import { preventPasswordInUrl, sanitizeUrlForLogging } from './middleware/security';
import {
  getShifts,
  createShift,
  requestSwap,
  approveSwap
} from './controllers/shifts';
import { getActivities } from './controllers/activities';
import {
  listShiftsHandler,
  createShiftHandler,
  publishShiftsHandler
} from './controllers/shift.controller';
import {
  listSwapsHandler,
  createSwapHandler,
  reviewSwapHandler
} from './controllers/swap.controller';
import { listActivitiesHandler } from './controllers/activity.controller';
import { listMembersHandler, inviteMemberHandler } from './controllers/team.controller';
import { getSubscriptionHandler, updateSeatsHandler, handleBillingWebhook } from './controllers/billing.controller';
import { getSettings, updateSettings, registerDeviceToken } from './controllers/settings';
import { validateRequest } from './middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  CreateShiftSchema,
  PublishShiftsSchema,
  CreateSwapSchema,
  InviteMemberSchema,
  UpdateSettingsSchema,
  RegisterDeviceTokenSchema,
  UpdateSeatsSchema,
  WebhookBodySchema
} from './schemas';
import { readYourOwnWritesMiddleware } from './db/router';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(preventPasswordInUrl);
app.use(readYourOwnWritesMiddleware);

// -------------------------------------------------------------
// Terminal HTTP Request Logger Middleware (Sanitized)
// -------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    const cleanUrl = sanitizeUrlForLogging(req.originalUrl || req.url);
    console.log(`[HTTP] ${req.method} ${cleanUrl} ${color}${status}${reset} - ${duration}ms`);
  });
  next();
});

// -------------------------------------------------------------
// Health Check Route (Checks Database Connectivity)
// -------------------------------------------------------------
app.get('/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: unknown) {
    const error = err as Error;
    dbStatus = `error: ${error.message}`;
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'rota-backend-api',
    uptime: process.uptime()
  });
});

// -------------------------------------------------------------
// Auth Routes (Public & Authenticated)
// -------------------------------------------------------------
app.post('/api/auth/register', validateRequest(registerSchema), registerHandler);
app.post('/api/auth/login', validateRequest(loginSchema), loginHandler);
app.get('/api/auth/password-requirements', passwordRequirementsHandler);
app.get('/api/v1/auth/password-requirements', passwordRequirementsHandler);
app.post('/api/auth/forgot-password', validateRequest(forgotPasswordSchema), forgotPasswordHandler);
app.post('/api/auth/refresh', validateRequest(refreshTokenSchema), refreshHandler);
app.post('/api/auth/logout', logoutHandler);
app.post('/api/auth/logout-all', authMiddleware, logoutAllHandler);
app.post('/api/auth/revoke-all', authMiddleware, revokeAllHandler);
app.get('/api/auth/me', authMiddleware, meHandler);

// -------------------------------------------------------------
// Core Shift Management Routes (Milestone 8)
// -------------------------------------------------------------
app.get('/api/shifts', authMiddleware, tenantContextMiddleware, getShifts);
app.post('/api/shifts', authMiddleware, tenantContextMiddleware, validateRequest(CreateShiftSchema), createShift);
app.post('/api/shifts/publish', authMiddleware, tenantContextMiddleware, validateRequest(PublishShiftsSchema), publishShiftsHandler);

// -------------------------------------------------------------
// Shift Swap Lifecycle Routes (Milestone 8)
// -------------------------------------------------------------
app.get('/api/swaps', authMiddleware, tenantContextMiddleware, listSwapsHandler);
app.post('/api/swaps', authMiddleware, tenantContextMiddleware, validateRequest(CreateSwapSchema), createSwapHandler);
app.post('/api/swaps/request', authMiddleware, tenantContextMiddleware, validateRequest(CreateSwapSchema), requestSwap);
app.post('/api/swaps/:id/approve', authMiddleware, tenantContextMiddleware, approveSwap);
app.post('/api/swaps/:swapId/review', authMiddleware, tenantContextMiddleware, approveSwap);

// -------------------------------------------------------------
// Activity Feed Routes (Cursor-Paginated - Milestone 8)
// -------------------------------------------------------------
app.get('/api/activities', authMiddleware, tenantContextMiddleware, getActivities);
app.get('/api/teams/:teamId/feed', authMiddleware, tenantContextMiddleware, getActivities);

// -------------------------------------------------------------
// Team Members & Role Management Routes
// -------------------------------------------------------------
app.get('/api/teams/members', authMiddleware, tenantContextMiddleware, listMembersHandler);
app.post('/api/teams/invite', authMiddleware, tenantContextMiddleware, validateRequest(InviteMemberSchema), inviteMemberHandler);

// -------------------------------------------------------------
// Subscription & Billing Routes
// -------------------------------------------------------------
app.get('/api/billing/subscription', authMiddleware, tenantContextMiddleware, getSubscriptionHandler);
app.post('/api/billing/seats', authMiddleware, tenantContextMiddleware, validateRequest(UpdateSeatsSchema), updateSeatsHandler);
app.post('/api/billing/webhook', validateRequest(WebhookBodySchema), handleBillingWebhook);

// -------------------------------------------------------------
// User Settings & Push Device Registration Routes (Milestone 10)
// -------------------------------------------------------------
app.get('/api/settings', authMiddleware, getSettings);
app.patch('/api/settings', authMiddleware, validateRequest(UpdateSettingsSchema), updateSettings);
app.post('/api/devices/token', authMiddleware, validateRequest(RegisterDeviceTokenSchema), registerDeviceToken);
app.post('/api/v1/devices/register', authMiddleware, validateRequest(RegisterDeviceTokenSchema), registerDeviceToken);

// -------------------------------------------------------------
// Centralized Error Handling Middleware
// -------------------------------------------------------------
app.use(errorHandler);

// If running directly as entry point
const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[Rota] Server running on http://localhost:${PORT}`);
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`[Database] SQLite database connection verified successfully.`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[Database] Connection warning/failure:`, error.message);
    }
  });
}

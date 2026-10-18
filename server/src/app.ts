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
  forgotPasswordHandler
} from './controllers/auth.controller';
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
import { readYourOwnWritesMiddleware } from './db/router';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(readYourOwnWritesMiddleware);

// -------------------------------------------------------------
// Terminal HTTP Request Logger Middleware
// -------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} ${color}${status}${reset} - ${duration}ms`);
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
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/forgot-password', forgotPasswordHandler);
app.post('/api/auth/refresh', refreshHandler);
app.post('/api/auth/logout', logoutHandler);
app.post('/api/auth/logout-all', authMiddleware, logoutAllHandler);
app.post('/api/auth/revoke-all', authMiddleware, revokeAllHandler);
app.get('/api/auth/me', authMiddleware, meHandler);

// -------------------------------------------------------------
// Core Shift Management Routes (Milestone 8)
// -------------------------------------------------------------
app.get('/api/shifts', authMiddleware, tenantContextMiddleware, getShifts);
app.post('/api/shifts', authMiddleware, tenantContextMiddleware, createShift);
app.post('/api/shifts/publish', authMiddleware, tenantContextMiddleware, publishShiftsHandler);

// -------------------------------------------------------------
// Shift Swap Lifecycle Routes (Milestone 8)
// -------------------------------------------------------------
app.get('/api/swaps', authMiddleware, tenantContextMiddleware, listSwapsHandler);
app.post('/api/swaps', authMiddleware, tenantContextMiddleware, createSwapHandler);
app.post('/api/swaps/request', authMiddleware, tenantContextMiddleware, requestSwap);
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
app.post('/api/teams/invite', authMiddleware, tenantContextMiddleware, inviteMemberHandler);

// -------------------------------------------------------------
// Subscription & Billing Routes
// -------------------------------------------------------------
app.get('/api/billing/subscription', authMiddleware, tenantContextMiddleware, getSubscriptionHandler);
app.post('/api/billing/seats', authMiddleware, tenantContextMiddleware, updateSeatsHandler);
app.post('/api/billing/webhook', handleBillingWebhook);

// -------------------------------------------------------------
// User Settings & Push Device Registration Routes (Milestone 10)
// -------------------------------------------------------------
app.get('/api/settings', authMiddleware, getSettings);
app.patch('/api/settings', authMiddleware, updateSettings);
app.post('/api/devices/token', authMiddleware, registerDeviceToken);
app.post('/api/v1/devices/register', authMiddleware, registerDeviceToken);

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

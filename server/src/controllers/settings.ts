import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../db/prisma';
import { UpdateSettingsSchema, RegisterDeviceTokenSchema } from '../schemas/settings';

/**
 * GET /api/settings
 * Returns the authenticated user's notification preferences, quiet hours, and server timestamp.
 */
export async function getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.sub || req.tenant?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
    });
    return;
  }

  // Find or create default settings
  let settings = await prisma.userSettings.findUnique({
    where: { userId }
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        timezone: 'Africa/Lagos',
        pushShiftChanges: true,
        pushSwapRequests: true,
        pushApprovals: true
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      timezone: settings.timezone,
      pushShiftChanges: settings.pushShiftChanges,
      pushSwapRequests: settings.pushSwapRequests,
      pushApprovals: settings.pushApprovals,
      updatedAt: settings.updatedAt.toISOString(),
      serverTimestamp: new Date().toISOString()
    }
  });
}

/**
 * PATCH /api/settings
 * Updates quiet hours, timezone, and push toggles. Stamps updatedAt timestamp.
 */
export async function updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.sub || req.tenant?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
    });
    return;
  }

  const data = UpdateSettingsSchema.parse(req.body);

  const updated = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      ...data,
      updatedAt: new Date()
    },
    create: {
      userId,
      quietHoursStart: data.quietHoursStart || '22:00',
      quietHoursEnd: data.quietHoursEnd || '06:00',
      timezone: data.timezone || 'Africa/Lagos',
      pushShiftChanges: data.pushShiftChanges ?? true,
      pushSwapRequests: data.pushSwapRequests ?? true,
      pushApprovals: data.pushApprovals ?? true
    }
  });

  res.status(200).json({
    success: true,
    data: {
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
      timezone: updated.timezone,
      pushShiftChanges: updated.pushShiftChanges,
      pushSwapRequests: updated.pushSwapRequests,
      pushApprovals: updated.pushApprovals,
      updatedAt: updated.updatedAt.toISOString(),
      message: 'Settings updated successfully.'
    }
  });
}

/**
 * POST /api/devices/token
 * Registers an Expo push token for the active user.
 */
export async function registerDeviceToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.sub || req.tenant?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
    });
    return;
  }

  const { token, platform } = RegisterDeviceTokenSchema.parse(req.body);

  const deviceToken = await prisma.deviceToken.upsert({
    where: {
      userId_token: {
        userId,
        token
      }
    },
    update: {
      platform
    },
    create: {
      userId,
      token,
      platform
    }
  });

  res.status(200).json({
    success: true,
    data: {
      id: deviceToken.id,
      token: deviceToken.token,
      platform: deviceToken.platform,
      message: 'Device token registered successfully.'
    }
  });
}

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { store } from '../services/store.service';

const GetActivitiesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  category: z.string().optional()
});

export function listActivitiesHandler(req: AuthenticatedRequest, res: Response): void {
  const query = GetActivitiesQuerySchema.parse(req.query);
  const teamId = (req.params.teamId as string) || req.tenant?.teamId || 'team-rota-main';

  const result = store.getActivityFeed(teamId, query.category, query.cursor, query.limit);

  res.status(200).json({
    success: true,
    data: result
  });
}

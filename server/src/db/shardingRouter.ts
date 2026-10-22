import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { shard1Client, shard2Client } from './sharding';

/**
 * ============================================================================
 * 2-Database Sharding Hash Router
 * ============================================================================
 * 
 * Deterministically routes tenant workloads across two PostgreSQL shards:
 *   SHA-256(team_id)[0..8] % 2 === 0 -> 'shard1' (Primary Shard 0)
 *   SHA-256(team_id)[0..8] % 2 === 1 -> 'shard2' (Secondary Shard 1)
 */

export type ShardKey = 'shard1' | 'shard2';

/**
 * Resolves the target database shard ('shard1' or 'shard2') for a given teamId.
 */
export function selectShard(teamId: string): ShardKey {
  if (!teamId || typeof teamId !== 'string') {
    throw new Error('Valid teamId string is required for shard routing.');
  }

  const hash = crypto.createHash('sha256').update(teamId).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 8), 16);
  return hashNumber % 2 === 0 ? 'shard1' : 'shard2';
}

/**
 * Returns the PrismaClient instance corresponding to the hashed shard for teamId.
 */
export function getRoutedPrismaClient(teamId: string): PrismaClient {
  const targetShard = selectShard(teamId);
  return targetShard === 'shard1' ? shard1Client : shard2Client;
}

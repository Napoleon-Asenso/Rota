import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createPooledPrismaClient } from './pool';

/**
 * ============================================================================
 * 2-Database Sharding Simulation Architecture
 * ============================================================================
 * 
 * In accordance with PRD.md, AGENTS.md, and .agents/skills/simulate-database-sharding/SKILL.md:
 * 
 * 1. CENTRAL DIRECTORY (Global Auth on Shard 0):
 *    Stores User, Team, TeamMembership, RefreshToken, DeviceToken.
 *    Queried during login without requiring a teamId.
 * 
 * 2. TENANT WORKLOAD DOMAIN (Sharded across Shard 0 and Shard 1):
 *    Stores Shift, ShiftSwapRequest, Activity, Subscription, SubscriptionLedger.
 *    Isolated horizontally by hashing teamId.
 * 
 * 3. RELATION MODE = "prisma":
 *    Zero cross-database foreign key joins; application-level referential integrity.
 */

const shard1Url =
  process.env.SHARD_1_DATABASE_URL ||
  process.env.DATABASE_URL_SHARD_0 ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/rota_db?schema=rota_shard_1';

const shard2Url =
  process.env.SHARD_2_DATABASE_URL ||
  process.env.DATABASE_URL_SHARD_1 ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/rota_db?schema=rota_shard_2';

// Shard 1 Client (Shard Index 0)
export const shard1Client: PrismaClient = createPooledPrismaClient(shard1Url);

// Shard 2 Client (Shard Index 1)
export const shard2Client: PrismaClient = createPooledPrismaClient(shard2Url);

// Fast 32-bit CRC implementation for CRC32 routing
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c;
}

export function crc32(str: string): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ str.charCodeAt(i)) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Resolves shard index using CRC32(teamId) % 2.
 */
export function resolveTeamShardIndex(teamId: string): 0 | 1 {
  const hash = crc32(teamId);
  return (hash % 2) as 0 | 1;
}

/**
 * Resolves shard index using MD5(teamId) % 2.
 */
export function resolveTeamShardIndexMd5(teamId: string): 0 | 1 {
  const hash = crypto.createHash('md5').update(teamId).digest('hex');
  const shardIndex = parseInt(hash.substring(0, 8), 16) % 2;
  return (shardIndex === 0 ? 0 : 1) as 0 | 1;
}

/**
 * Milestone 11 Required Shard Router:
 * Hashes teamId to select between shard1Client (index 0) and shard2Client (index 1).
 */
export function getShardClient(teamId: string): PrismaClient {
  const hash = crypto.createHash('md5').update(teamId).digest('hex');
  const shardIndex = parseInt(hash.substring(0, 8), 16) % 2;
  return shardIndex === 0 ? shard1Client : shard2Client;
}

/**
 * ShardedPrismaManager class providing Central Directory and Tenant-bound routing.
 */
export class ShardedPrismaManager {
  public static getCentralClient(): PrismaClient {
    // Central Directory resides on Shard 1
    return shard1Client;
  }

  public static getClient(teamId: string): PrismaClient {
    return getShardClient(teamId);
  }

  public static async disconnectAll(): Promise<void> {
    await Promise.all([
      shard1Client.$disconnect(),
      shard2Client.$disconnect()
    ]);
  }
}

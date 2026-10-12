import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * Connection Pooling Configuration & Documentation
 * ============================================================================
 * 
 * WHY 20 CONNECTIONS WAS CHOSEN:
 * 
 * 1. POSTGRESQL CONNECTION EXHAUSTION MITIGATION:
 *    A standard managed PostgreSQL instance (e.g. AWS RDS t4g.medium or Supabase)
 *    has a default `max_connections` ceiling typically between 100 and 200.
 *    In a scaled horizontal deployment (e.g., 4 to 8 Node.js worker/API replicas),
 *    an unbounded or oversized pool (e.g., 50+ per instance) easily exhausts
 *    PostgreSQL connections during traffic surges, triggering fatal `53300: too many clients`
 *    and system-wide outages.
 * 
 * 2. NODE.JS ASYNCHRONOUS EVENT LOOP CONCURRENCY:
 *    Node.js operates on a single-threaded event loop with non-blocking I/O.
 *    Benchmarks demonstrate that a well-tuned connection pool of 20 connections
 *    can comfortably saturate 2,000+ requests per second without incurring the
 *    massive OS context switching overhead, query queue buffer bloat, and RAM footprint
 *    caused by hundreds of concurrent idle PostgreSQL backend processes.
 * 
 * 3. PGBOUNCER TRANSACTION POOLING COMPATIBILITY:
 *    When operating behind PgBouncer or Supabase transaction pooling, keeping
 *    the client-side pool size at 20 prevents connection starvation and ensures
 *    clean connection recycling without exceeding backend pool bounds.
 */

export interface PoolConfig {
  connectionLimit: number;
  poolTimeoutSeconds: number;
  connectTimeoutSeconds: number;
}

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  // Hard ceiling of 20 connections per Node.js process to prevent PostgreSQL exhaustion
  connectionLimit: 20,
  // Max time in seconds to wait for an available connection from the pool before throwing an error
  poolTimeoutSeconds: 10,
  // Max time in seconds for the initial TCP socket connection to establish
  connectTimeoutSeconds: 10
};

/**
 * Injects connection pool parameters into a PostgreSQL connection URI.
 */
export function buildPooledDatabaseUrl(baseUrl: string, config: PoolConfig = DEFAULT_POOL_CONFIG): string {
  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set('connection_limit', config.connectionLimit.toString());
    parsed.searchParams.set('pool_timeout', config.poolTimeoutSeconds.toString());
    parsed.searchParams.set('connect_timeout', config.connectTimeoutSeconds.toString());
    return parsed.toString();
  } catch {
    // If URL parsing fails (e.g. relative or mock format), append via query delimiter
    const delimiter = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${delimiter}connection_limit=${config.connectionLimit}&pool_timeout=${config.poolTimeoutSeconds}&connect_timeout=${config.connectTimeoutSeconds}`;
  }
}

/**
 * Creates a PrismaClient instance explicitly bound to the 20-connection pool.
 */
export function createPooledPrismaClient(
  databaseUrl: string = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rota_db',
  config: PoolConfig = DEFAULT_POOL_CONFIG
): PrismaClient {
  const pooledUrl = buildPooledDatabaseUrl(databaseUrl, config);

  return new PrismaClient({
    datasources: {
      db: {
        url: pooledUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });
}

// Default application-wide pooled Prisma Client
export const pooledPrisma = createPooledPrismaClient();

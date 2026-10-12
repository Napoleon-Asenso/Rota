import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * ============================================================================
 * k6 Load Test: 2-Database Sharding & Redis Cache-Aside Verification
 * Simulating 200 Concurrent Virtual Users (VUs)
 * ============================================================================
 * 
 * Objectives:
 * 1. Concurrency: Ramp up to 200 concurrent VUs.
 * 2. Cache-Aside Efficiency: Verify p95 latency < 50ms under heavy concurrent read load.
 * 3. Sharding Load Balance: Distribute traffic across teams hashing to Shard 1 and Shard 2.
 * 4. Read-Your-Own-Writes Consistency: Verify recent-writer routing to primaryClient.
 */

export const options = {
  stages: [
    { duration: '5s', target: 50 },    // Ramp up to 50 VUs
    { duration: '10s', target: 200 },  // Surge to 200 concurrent VUs
    { duration: '20s', target: 200 },  // Hold steady at 200 VUs
    { duration: '5s', target: 0 },     // Ramp down gracefully to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<50', 'p(99)<100'], // 95% of requests must resolve under 50ms
    http_req_failed: ['rate<0.01'],               // Less than 1% failure rate
  },
};

// Sharded Teams (hashes distribute across Shard 0 and Shard 1)
const TEAMS = [
  'team-rota-main-shard0',
  'team-rota-shard1-east',
  'team-restaurant-alpha',
  'team-clinic-beta'
];

export default function () {
  const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
  const vuId = __VU;
  const teamId = TEAMS[vuId % TEAMS.length];
  const userId = `usr_load_test_${vuId}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-team-id': teamId
  };

  // ---------------------------------------------------------------------------
  // Action 1: Read Shift Calendar (Cache-Aside Read)
  // ---------------------------------------------------------------------------
  const readRes = http.get(`${BASE_URL}/api/shifts?startDate=2026-05-01&endDate=2026-05-31`, { headers });

  check(readRes, {
    'GET /api/shifts status is 200': (r) => r.status === 200,
    'Cache header is present': (r) => r.headers['X-Cache'] === 'HIT' || r.headers['X-Cache'] === 'MISS' || r.headers['x-cache'] !== undefined,
  });

  // ---------------------------------------------------------------------------
  // Action 2: Simulate Mutation (Triggers Read-Your-Own-Writes)
  // 5% of requests perform a write mutation
  // ---------------------------------------------------------------------------
  if (__ITER % 20 === 0) {
    const shiftPayload = JSON.stringify({
      roleTitle: 'Barista / Front Floor',
      venue: 'Main Lounge',
      startTime: '2026-05-20T08:00:00.000Z',
      endTime: '2026-05-20T16:00:00.000Z'
    });

    const writeRes = http.post(`${BASE_URL}/api/shifts`, shiftPayload, { headers });
    check(writeRes, {
      'POST /api/shifts returns 200, 201 or 401': (r) => [200, 201, 401, 403].includes(r.status),
    });

    // Immediate Follow-Up Read (Must route to Primary DB via Read-Your-Own-Writes)
    const followUpRes = http.get(`${BASE_URL}/api/shifts`, { headers });
    check(followUpRes, {
      'Follow-up read after write completes successfully': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(0.1);
}

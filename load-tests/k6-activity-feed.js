import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<20'], // p95 latency must be under 20ms
  },
};

export default function () {
  const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
  const teamId = 'team-rota-main';

  // Request first page
  const res = http.get(`${BASE_URL}/api/activities?category=All&limit=25`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has items': (r) => JSON.parse(r.body).data.items.length > 0,
  });

  const nextCursor = JSON.parse(res.body).data.nextCursor;
  if (nextCursor) {
    const page2 = http.get(`${BASE_URL}/api/activities?category=All&limit=25&cursor=${nextCursor}`);
    check(page2, {
      'page 2 status is 200': (r) => r.status === 200,
    });
  }

  sleep(0.5);
}

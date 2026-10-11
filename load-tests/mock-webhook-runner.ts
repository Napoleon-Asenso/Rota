import crypto from 'crypto';
import http from 'http';

/**
 * CLI script generating signed Flutterwave payloads for CI and worker test harness.
 */
async function runMockWebhook() {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || 'test_flw_secret_hash_value';
  const txRef = `tx_test_${Date.now()}`;

  const payload = JSON.stringify({
    event: 'charge.completed',
    data: {
      id: 994821,
      tx_ref: txRef,
      flw_ref: `flw_${Date.now()}`,
      amount: 12.0, // $12.00
      currency: 'USD',
      status: 'successful',
      customer: {
        email: 'elena@bistro.com',
        name: 'Elena Rostova'
      }
    }
  });

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/billing/webhooks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'verif-hash': secretHash
    }
  };

  console.log(`[Mock Webhook] Sending signed webhook payload with tx_ref: ${txRef}...`);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`[Mock Webhook] Received status: ${res.statusCode}`);
      console.log(`[Mock Webhook] Response: ${data}`);
    });
  });

  req.on('error', (e) => {
    console.error(`[Mock Webhook] Request failed: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

runMockWebhook();

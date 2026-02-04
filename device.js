// TickTick OAuth Device Flow helper (scaffold)
// Usage: node device.js
// Reads client_id from /home/node/.openclaw/secrets/ticktick_oauth.json
// Saves tokens to /home/node/.openclaw/secrets/ticktick_tokens.json

const fs = require('fs');
const fetch = require('node-fetch');
const SECRETS_PATH = '/home/node/.openclaw/secrets/ticktick_oauth.json';
const TOKENS_PATH = '/home/node/.openclaw/secrets/ticktick_tokens.json';

async function loadClient() {
  const raw = fs.readFileSync(SECRETS_PATH, 'utf8');
  return JSON.parse(raw);
}

async function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

async function run() {
  const client = await loadClient();
  const client_id = client.client_id;
  if (!client_id) throw new Error('client_id missing in ' + SECRETS_PATH);

  // Device code endpoint (common pattern). If TickTick supports device flow, this should work.
  const deviceEndpoint = 'https://api.ticktick.com/oauth/device/code';
  const tokenEndpoint = 'https://api.ticktick.com/oauth/token';

  console.log('Requesting device code from', deviceEndpoint);
  const deviceRes = await fetch(deviceEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id })
  });

  if (!deviceRes.ok) {
    const txt = await deviceRes.text();
    console.error('Device code request failed:', deviceRes.status, txt);
    process.exit(1);
  }

  const deviceJson = await deviceRes.json();
  // Expected fields: device_code, user_code, verification_uri, expires_in, interval
  console.log('Follow these steps to authorize:');
  console.log('- Open in your browser:', deviceJson.verification_uri || deviceJson.verification_url || deviceJson.verification_uri_complete);
  console.log('- Enter code (if needed):', deviceJson.user_code || '(no user code provided)');
  console.log('- Then wait here; the script will poll until approved or expired.');

  const interval = deviceJson.interval || 5;
  const device_code = deviceJson.device_code;

  // Poll for token
  while (true) {
    await new Promise(r => setTimeout(r, interval * 1000));
    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: device_code,
        client_id: client_id
      })
    });

    const tokenText = await tokenRes.text();
    try {
      const tokenJson = JSON.parse(tokenText);
      if (tokenRes.ok && tokenJson.access_token) {
        console.log('Authorization complete — saving tokens to', TOKENS_PATH);
        await saveTokens(tokenJson);
        process.exit(0);
      } else {
        // expected errors: authorization_pending, slow_down, access_denied, expired_token
        console.log('Polling response:', tokenJson.error || tokenJson);
        if (tokenJson.error === 'access_denied' || tokenJson.error === 'expired_token') {
          console.error('Authorization failed:', tokenJson.error);
          process.exit(1);
        }
        if (tokenJson.error === 'slow_down') {
          // increase interval
          console.log('Server asked to slow down — increasing poll interval.');
        }
      }
    } catch (e) {
      console.error('Failed to parse token response:', tokenText);
    }
  }
}

run().catch(err => { console.error(err); process.exit(1); });

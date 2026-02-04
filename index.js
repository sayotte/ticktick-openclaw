// Minimal TickTick OAuth PKCE localhost callback helper
const fs = require('fs');
const path = require('path');
const express = require('express');
const open = require('open');
const fetch = require('node-fetch');
const pkce = require('pkce-challenge');

const SECRETS_PATH = '/home/node/.openclaw/secrets/ticktick_oauth.json';
const TOKENS_PATH = '/home/node/.openclaw/secrets/ticktick_tokens.json';
const REDIRECT_URI = 'http://localhost:3333/callback';
const PORT = 3333;

async function loadClient() {
  const raw = fs.readFileSync(SECRETS_PATH, 'utf8');
  return JSON.parse(raw);
}

async function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

async function run() {
  const client = await loadClient();
  const { client_id } = client;
  const { code_verifier, code_challenge } = pkce();

  const authorizeUrl = `https://api.ticktick.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${encodeURIComponent(code_challenge)}&code_challenge_method=plain`;

  const app = express();

  app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
      res.status(400).send('Missing code');
      return;
    }

    // Exchange code for token
    try {
      const tokenRes = await fetch('https://api.ticktick.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
          client_id: client_id,
          code_verifier: code_verifier
        })
      });
      const tokenJson = await tokenRes.json();
      await saveTokens(tokenJson);
      res.send('OK — tokens saved to ' + TOKENS_PATH);
      console.log('Saved tokens to', TOKENS_PATH);
      process.exit(0);
    } catch (err) {
      console.error('token exchange failed', err);
      res.status(500).send('token exchange failed');
    }
  });

  app.listen(PORT, () => {
    console.log('Listening for OAuth callback on', REDIRECT_URI);
    console.log('Opening browser to', authorizeUrl);
    open(authorizeUrl);
  });
}

run().catch(err => { console.error(err); process.exit(1); });

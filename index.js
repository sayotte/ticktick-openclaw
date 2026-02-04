// Minimal TickTick OAuth PKCE callback helper using built-in http (no external deps)
const fs = require('fs');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

const SECRETS_PATH = '/home/node/.openclaw/secrets/ticktick_oauth.json';
const TOKENS_PATH = '/home/node/.openclaw/secrets/ticktick_tokens.json';
const PKCE_PATH = '/home/node/.openclaw/workspace/skills/ticktick/.pkce.json';
const REDIRECT_URI = 'https://dianoia.needlesslycomplex.net:3333/callback';
const PORT = 3333;

function loadJson(p) { return JSON.parse(fs.readFileSync(p,'utf8')); }
function saveJson(p,o){ fs.writeFileSync(p,JSON.stringify(o,null,2),{mode:0o600}); }

async function exchangeCode(code, verifier, client_id) {
  const tokenEndpoint = 'https://api.ticktick.com/oauth/token';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: client_id,
    code_verifier: verifier
  });
  const res = await fetch(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return res.json();
}

async function run(){
  const client = loadJson(SECRETS_PATH);
  const pkce = loadJson(PKCE_PATH);
  const client_id = client.client_id;
  const verifier = pkce.verifier;

  const authorizeUrl = `https://api.ticktick.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${encodeURIComponent(pkce.challenge)}&code_challenge_method=S256`;

  const server = http.createServer(async (req,res)=>{
    const q = url.parse(req.url,true);
    if(q.pathname === '/callback'){
      const code = q.query.code;
      if(!code){ res.writeHead(400); res.end('Missing code'); return; }
      try{
        const tokenJson = await exchangeCode(code, verifier, client_id);
        saveJson(TOKENS_PATH, tokenJson);
        res.writeHead(200); res.end('OK — tokens saved');
        console.log('Saved tokens to', TOKENS_PATH);
        // don't exit immediately, leave server running
      }catch(e){ console.error('exchange failed',e); res.writeHead(500); res.end('exchange failed'); }
    } else {
      res.writeHead(200); res.end('TickTick OAuth listener');
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('Listening for OAuth callback on', REDIRECT_URI);
    console.log('Authorize URL (open in browser):', authorizeUrl);
  });
}

run().catch(e=>{ console.error(e); process.exit(1); });

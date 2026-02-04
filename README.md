# ticktick-openclaw

Minimal TickTick integration scaffold for OpenClaw.

Purpose
- Interactive one-time OAuth PKCE flow using a localhost callback.
- Stores client_id/client_secret in /home/node/.openclaw/secrets/ticktick_oauth.json
- Stores received tokens in /home/node/.openclaw/secrets/ticktick_tokens.json (chmod 600)

Redirect URI to register with TickTick (use when creating OAuth client):

  http://localhost:3333/callback

How to run (initial auth)
1. Ensure your ticktick_oauth.json exists with at least:
   {
     "client_id": "<your_client_id>",
     "client_secret": "<your_client_secret>"
   }
2. From the workspace directory:
   npm install
   node index.js
3. A browser will open to TickTick's authorize page. Log in and approve.
4. After approval TickTick will redirect to the localhost callback and the tokens will be saved.

Notes
- This uses PKCE and does not send client_secret during the code exchange endpoint.
- After initial auth the skill can use the stored refresh_token to renew access tokens programmatically.

Security
- Do NOT store secrets in source control. Keep /home/node/.openclaw/secrets/*.json chmod 600.

License: MIT

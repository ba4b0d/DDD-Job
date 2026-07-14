# Deployment via Gitea release artifacts

## One-time setup
- Generate a personal access token at Gitea: **Settings → Applications → Generate Token** (scopes: `write:repository`)
- On the Pi5, install nginx (or Caddy) and pick a web root, e.g. `/srv/3djat-web`

## Publish a new build (your PC)
```bash
export GITEA_TOKEN=xxx
export GITEA_BASE_URL=http://192.168.100.33:3000
./scripts/release-gitea.sh v1.0.0
```
This:
1. Builds the Vite frontend (`npm ci && npm run build`)
2. Creates a GitHub-style release on Gitea with the tag (or reuses it)
3. Uploads `frontend/dist/.tar.gz` as an asset

## Deploy to Pi5 (server)
```bash
export GITEA_TOKEN=xxx
export GITEA_BASE_URL=http://192.168.100.33:3000
export WEBROOT=/srv/3djat-web
./scripts/deploy-from-gitea.sh latest   # or a specific tag like v1.0.0
```
This downloads the latest artifact and extracts it under `$WEBROOT`.

## Nginx config hint
```nginx
server {
  listen 80;
  server_name _;
  root /srv/3djat-web;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }   # SPA fallback
  location /api/ { proxy_pass http://127.0.0.1:8000; }   # backend
  location /uploads/ { proxy_pass http://127.0.0.1:8000; }
}
```
Then add Caddy/nginx for HTTPS on `192.168.100.51` if you want Tailscale-only TLS.

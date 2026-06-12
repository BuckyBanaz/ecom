# AI Handoff — Production Infrastructure Map (Schip & Ster / schipenster.com)

> **Purpose:** Give another AI (or developer) a single source of truth for where things live on the production server, how deploy works, and what is stored where (`.env` vs database vs Docker volumes).
>
> **Last updated:** June 2026 · **Deploy branch:** `code-deploy` · **Server app path:** `/opt/ecom`

---

## 1. Live URLs & Domains

| Service | URL |
|---------|-----|
| Storefront | https://schipenster.com |
| Storefront (www) | https://www.schipenster.com |
| Backend API | https://api.schipenster.com |
| Jenkins UI | https://jenkins.schipenster.com |
| API health | https://api.schipenster.com/health |
| Swagger | https://api.schipenster.com/api-docs |

`DOMAIN` in `.env.production` = `schipenster.com` (Caddy substitutes `{$DOMAIN}`).

---

## 2. Server Layout (Host — VPS)

```
/opt/ecom/                          ← Git repo root (NOT /var/www/ecom)
├── .env.production                 ← MASTER secrets + admin-persisted settings (NEVER in git)
├── .env.production.bak             ← Auto-backup on each admin settings save
├── docker-compose.prod.yml         ← Production stack definition
├── Caddyfile                       ← Reverse proxy rules (mounted into caddy container)
├── Jenkinsfile                     ← Jenkins pipeline
├── scripts/
│   ├── deploy.sh                   ← Main deploy script (used by Jenkins)
│   ├── health-check.sh             ← Post-deploy API smoke test
│   ├── rollback.sh                 ← Git checkout + redeploy older commit
│   ├── setup-jenkins.sh          ← One-time Jenkins stack setup
│   └── restart-jenkins-stack.sh
├── backend/                        ← Node/Express API source
├── frontend/                       ← Vite/React storefront source
└── jenkins/                        ← Custom Jenkins image (Docker CLI inside)
```

**SSH:** User typically `root` on Hostinger VPS. All `docker compose` commands run from `/opt/ecom`.

---

## 3. Docker Compose Stack (`docker-compose.prod.yml`)

Project name: `ecom` (containers prefixed `ecom-`).

| Service | Image / Build | Host ports | Role |
|---------|---------------|------------|------|
| `postgres` | postgres:15-alpine | internal 5432 | Primary database |
| `redis` | redis:7-alpine | internal 6379 | Cache, rate limits, sessions |
| `backend` | build `./backend` | internal 5000 | Express API + Prisma |
| `frontend` | build `./frontend` | internal 80 (nginx) | Static React build |
| `caddy` | caddy:2.8-alpine | **80, 443** | TLS + reverse proxy |
| `jenkins` | build `./jenkins` | **127.0.0.1:8080** only | CI/CD (public via Caddy) |

**Deploy script rebuilds:** `backend`, `frontend`, `caddy` (not postgres/redis/jenkins every time unless manually recreated).

```bash
cd /opt/ecom
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 4. Caddy Routing (`Caddyfile`)

Caddy terminates HTTPS (Let's Encrypt via `ACME_EMAIL` in `.env.production`).

```
schipenster.com, www.schipenster.com
  /robots.txt   → backend:5000
  /sitemap.xml  → backend:5000
  /*            → frontend:80

api.schipenster.com
  /*            → backend:5000

jenkins.schipenster.com
  /*            → jenkins:8080  (websockets, no gzip)
```

**Why robots/sitemap go to backend:** SEO files are generated/served from backend volume `/app/seo`, not from frontend nginx.

---

## 5. Environment Files — CRITICAL

### 5.1 Production (server)

| Location | Persists? | Purpose |
|----------|-----------|---------|
| `/opt/ecom/.env.production` | **YES** (host disk) | Single source of truth for secrets + admin settings |
| `/app/.env.production` (backend container) | Same file (bind mount) | Backend reads/writes here |
| `/app/.env` (container only) | **NO** — ephemeral | **OLD BUG:** pre-fix code wrote here; data lost on restart |

**Bind mount in compose:**
```yaml
./.env.production:/app/.env.production
SETTINGS_ENV_FILE: /app/.env.production
```

**Code:** `backend/src/services/settingsStore.ts` — all admin saves go through `saveSettings()` → host file.

**On backend startup:** `loadPersistedSettings()` in `backend/src/index.ts` reloads file into `process.env`.

### 5.2 Local development

| Location | Purpose |
|----------|---------|
| `backend/.env` | Local dev secrets (not used in production) |

### 5.3 What belongs in `.env.production`

**Base (from `.env.production.example`):**
- `DOMAIN`, `ACME_EMAIL`
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `CLIENT_URL`, `API_URL`, `VITE_*`
- `STRIPE_*`, `ENABLE_REDIS`

**Added by Admin panel saves (examples):**
- `SMTP_*` — email
- `STORE_NAME`, `STORE_URL`, `SUPPORT_EMAIL`, `STORE_CURRENCY`, `MAINTENANCE_*` — general
- `PAYMENT_ENABLE_*`, `STRIPE_*` — payments
- `AUTH_*`, `TWILIO_*` — auth/SMS
- `SEO_*`, `ANALYTICS_*`, `GA4_*` — SEO & analytics
- `SENDCLOUD_*` — shipping API keys

**Verify on server:**
```bash
grep -E '^[A-Z_]+=' /opt/ecom/.env.production | cut -d= -f1 | sort
# Admin keys after re-save:
grep -E '^(SMTP_|STORE_|SEO_|SENDCLOUD_)' /opt/ecom/.env.production
```

---

## 6. What Is NOT in `.env` — Database (`cms_config` table)

CMS / content admin settings live in **PostgreSQL**, table `cms_config` (Prisma model `CmsConfig`).

| `key` | Content |
|-------|---------|
| `homepage_data` | Homepage CMS blocks |
| `header_footer_data` | Header/footer text, social links |
| `landing_pages_data` | Category landing pages + mega menu |
| `relief_page_data` | Relief page content |
| `store_features` | Shipping banner features (icons/text) |
| `shipping_config` | Free shipping threshold, fees, cutoff time |
| `notification_channels_config` | Email/SMS notification toggles |

**Check DB:**
```bash
docker compose -f /opt/ecom/docker-compose.prod.yml exec postgres \
  psql -U postgres -d ecom_db -c "SELECT key, updated_at FROM cms_config ORDER BY key;"
```

**Products, orders, users, categories, brands** → normal Prisma tables in Postgres (not env).

---

## 7. Docker Volumes (persistent data)

| Volume name | Mounted at (backend) | Contents |
|-------------|----------------------|----------|
| `postgres_data` | `/var/lib/postgresql/data` (postgres svc) | All DB data |
| `redis_data` | `/data` (redis svc) | Redis AOF |
| `backend_uploads` | `/app/public/uploads` | Product/media uploads |
| `backups_data` | `/app/backups` | Admin backup ZIPs |
| `seo_files` | `/app/seo` | `robots.txt`, `sitemap.xml` |
| `jenkins_home` | `/var/jenkins_home` | Jenkins jobs, credentials |
| `caddy_data` | `/data` (caddy) | TLS certificates |
| `caddy_config` | `/config` (caddy) | Caddy config cache |

**`.env.production` is NOT a Docker volume** — it is a **bind mount** from host `./.env.production`.

---

## 8. Jenkins CI/CD

| Item | Value |
|------|-------|
| Pipeline file | `/opt/ecom/Jenkinsfile` |
| Default deploy branch | `code-deploy` (set in Jenkins job parameter) |
| App dir | `/opt/ecom` |
| Compose file | `docker-compose.prod.yml` |
| Deploy script | `scripts/deploy.sh` |

**Flow:**
1. Jenkins container has Docker socket + `/opt/ecom` mounted
2. Runs `scripts/deploy.sh` with `BRANCH=code-deploy`
3. `git pull` → `docker compose build --no-cache backend frontend caddy` → `up -d --force-recreate`
4. Runs `scripts/health-check.sh` (curl `api.schipenster.com/health`)

**Manual deploy (no Jenkins):**
```bash
cd /opt/ecom
BRANCH=code-deploy bash scripts/deploy.sh
```

**Jenkins only on localhost inside server:** port `127.0.0.1:8080`; public access via `jenkins.schipenster.com` through Caddy.

---

## 9. Key Backend Code Paths

| Feature | File(s) |
|---------|---------|
| Settings persist (.env) | `backend/src/services/settingsStore.ts` |
| Admin settings API | `backend/src/controllers/adminSettingsController.ts` |
| Shipping (DB + Sendcloud env) | `backend/src/controllers/shippingController.ts` |
| CMS homepage/footer/etc | `backend/src/controllers/cmsController.ts` |
| Mega menu / landing pages | `backend/src/controllers/megaMenuController.ts` |
| Products API (null-safe brand) | `backend/src/controllers/productController.ts` + `backend/src/utils/productSerializer.ts` |
| robots.txt / sitemap routes | `backend/src/app.ts` (public GET) |
| DB schema | `backend/prisma/schema.prisma` |
| Startup | `backend/src/index.ts` → `loadPersistedSettings()` then listen :5000 |

**Backend Dockerfile note:** Build uses `npm run build || true` but **requires** these files exist:
- `dist/services/settingsStore.js`
- `dist/controllers/adminSettingsController.js`

---

## 10. Key Frontend Code Paths

| Feature | File(s) |
|---------|---------|
| API client + caching | `frontend/src/client/apiClient.ts` |
| Product null-safe helpers | `frontend/src/utils/formatters.ts` (`getProductBrandName`, `normalizeApiProduct`) |
| Category page + filters | `frontend/src/pages/shop/Category.tsx` |
| Product card | `frontend/src/components/shop/ProductCard.tsx` |
| Auto-translation (NL) | `frontend/src/utils/translator.ts` — **must be committed** if imported in apiClient |
| i18n | `frontend/src/i18n.ts` |

**Frontend build args (Docker):** `VITE_API_URL=https://api.${DOMAIN}`, `VITE_APP_URL=https://${DOMAIN}`

---

## 11. Known Production Gotchas (for AI debugging)

### 11.1 Category page crash: `Cannot read properties of null (reading 'name')`
- **Cause:** Products with `brand: null` in DB; old `ProductCard` did `typeof brand === "object" ? brand.name : brand` and `typeof null === "object"`.
- **Fix commits:** `d89ee3d` (frontend), `productSerializer.ts` (backend returns `brand: ""`).
- **Requires:** Frontend + backend redeploy.

### 11.2 Admin settings "lost" after restart
- **Cause:** Old code wrote to `/app/.env` (not mounted). SEO may survive if saved after `settingsStore` fix.
- **Fix:** Re-save all admin settings after deploy; verify keys in `/opt/ecom/.env.production`.
- **CMS content** was never lost — it's in `cms_config` table.

### 11.3 Jenkins frontend build fail: `Could not resolve "../utils/translator"`
- **Cause:** Commit `d89ee3d` imported `translator.ts` before the file was committed.
- **Fix:** Ensure HEAD includes `ca6921f` or later (file `frontend/src/utils/translator.ts` exists).

### 11.4 robots.txt / sitemap wrong path errors
- **Cause:** Old backend wrote to `/frontend/public/` inside container.
- **Fix:** `SEO_FILES_DIR=/app/seo`, volume `seo_files`, Caddy proxies to backend.

### 11.5 Admin toasts invisible
- **Cause:** `body.admin-lock { overflow: hidden }` clipped fixed Sonner toasts.
- **Fix:** `frontend/src/index.css`, `frontend/src/components/ui/sonner.tsx`

---

## 12. Useful Server Commands (copy-paste)

```bash
# Where am I / what commit?
cd /opt/ecom && git log -1 --oneline && git branch

# Container status
docker compose -f /opt/ecom/docker-compose.prod.yml ps

# Backend logs
docker compose -f /opt/ecom/docker-compose.prod.yml logs -f --tail=100 backend

# Env file (keys only)
grep -E '^[A-Z_]+=' /opt/ecom/.env.production | cut -d= -f1 | sort

# Settings store loaded?
docker compose -f /opt/ecom/docker-compose.prod.yml logs backend 2>&1 | grep -i "Loaded.*settings"

# DB cms keys
docker compose -f /opt/ecom/docker-compose.prod.yml exec postgres \
  psql -U postgres -d ecom_db -c "SELECT key FROM cms_config;"

# API health
curl -s https://api.schipenster.com/health | jq .

# Test product brand null-safe
curl -s "https://api.schipenster.com/api/v1/products?limit=3" | grep -o '"brand":"[^"]*"\|"brand":null'

# Restart one service
docker compose -f /opt/ecom/docker-compose.prod.yml restart backend

# Full redeploy
cd /opt/ecom && BRANCH=code-deploy bash scripts/deploy.sh
```

---

## 13. Git Branches

| Branch | Use |
|--------|-----|
| `code-deploy` | **Production** — Jenkins deploys this |
| `main` / `v1.4` | Older/stable lines (Jenkins parameter options) |

**Never commit:** `.env.production` (in `.gitignore`).

---

## 14. Related Docs in Repo

| Doc | Topic |
|-----|-------|
| `docs/production_deployment_checklist.md` | Pre/post deploy checklist |
| `docs/backup_restore_guide.md` | DB + uploads backup (`.env` manual copy) |
| `docs/sendcloud_integration.md` | Sendcloud shipping |
| `docs/v1.4-cicd-jenkins-plan.md` | Jenkins architecture plan |
| `README.md` | Project overview + feature status |

---

## 15. Quick Architecture Diagram

```
Internet
   │
   ▼
[Caddy :443]  ← Caddyfile, TLS from caddy_data volume
   ├── schipenster.com     → [frontend nginx :80]  (React static)
   ├── api.schipenster.com → [backend :5000]       (Express/Prisma)
   └── jenkins.*           → [jenkins :8080]

[backend]
   ├── mount: /opt/ecom/.env.production → /app/.env.production
   ├── volume: backend_uploads → /app/public/uploads
   ├── volume: seo_files       → /app/seo
   ├── volume: backups_data    → /app/backups
   ├── → postgres:5432 (ecom_db)
   └── → redis:6379

[Jenkins]
   ├── docker.sock (build images on host)
   └── /opt/ecom (runs scripts/deploy.sh)
```

---

*End of handoff doc. When in doubt: secrets/CMS split is **env file vs `cms_config` table**; persistent host path is **`/opt/ecom`**; deploy branch is **`code-deploy`**.*

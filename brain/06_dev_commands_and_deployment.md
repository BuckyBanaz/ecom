# 🚀 Dev Commands & Deployment — Brain File

---

## 💻 Local Development

### Start Local DB + Redis (Docker)
```bash
# From root /ecom
docker-compose up -d
```
This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend on port 5000 (optional — can run manually)

### Start Backend
```bash
cd backend
npm run dev
# Uses ts-node-dev with hot reload
# Runs on: http://localhost:5000
```

### Start Frontend
```bash
cd frontend
npm run dev
# Runs on: http://localhost:5173
```

### Prisma Commands
```bash
cd backend

# Generate Prisma client after schema change
npm run prisma:generate

# Create and run migration
npm run prisma:migrate

# Open Prisma Studio (DB GUI)
npm run prisma:studio

# Seed all data
npm run prisma:seed

# Seed only products
npm run prisma:seed:products

# Seed mega menu
npm run prisma:seed:megamenu

# Seed email templates
npm run prisma:seed:templates
```

### Frontend Build
```bash
cd frontend
npm run build          # Production build
npm run build:dev      # Dev mode build
npm run preview        # Preview production build
npm run test           # Run Vitest tests
npm run test:watch     # Watch mode tests
npm run lint           # ESLint
```

---

## 🌐 Production Deployment

### Production deploy (SSH)

Push to `code-deploy`, then on VPS:

```bash
cd /opt/ecom
BRANCH=code-deploy bash scripts/deploy.sh
```

See `docs/vps_operations_runbook.md` for full ops commands.

```bash
# Navigate to project
cd /opt/ecom

# View running containers
docker ps

# View backend logs (live)
docker logs -f ecom-backend

# Restart backend only
docker-compose -f docker-compose.prod.yml restart backend

# Full production restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Check disk usage
df -h

# Prisma migrate on production
docker exec -it ecom-backend npx prisma migrate deploy
```

### Production Docker Compose
```bash
# Uses docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ecom_db
REDIS_URL=redis://localhost:6379
ENABLE_REDIS=true
PORT=5000
NODE_ENV=production

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

CLIENT_URL=https://schipenster.com
API_URL=https://api.schipenster.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+31...

# Email (Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@schipenster.com
SMTP_PASS=...

# Firebase Admin
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Sendcloud
SENDCLOUD_PUBLIC_KEY=...
SENDCLOUD_SECRET_KEY=...
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
# Production:
VITE_API_URL=https://api.schipenster.com/api/v1

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

---

## 🧪 Testing

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test           # Run all tests once
npm run test:watch     # Watch mode
```
Tests located in: `frontend/src/test/`

### API Testing
- Swagger UI available at: `http://localhost:5000/api-docs`
- Can test all endpoints interactively

### Health Check
```bash
curl http://localhost:5000/health
# Returns: { success: true, status: "healthy", redis: "connected", uptime: 123 }
```

---

## 📦 Docker Images

| Service | Image |
|---------|-------|
| Database | `postgres:15-alpine` |
| Cache | `redis:7-alpine` |
| Backend | Custom (builds from `backend/Dockerfile`) |
| Frontend | Custom (builds from `frontend/Dockerfile`, served via nginx) |

---

## 🔄 Production deploy flow

1. Push to `code-deploy` branch
2. SSH to VPS: `cd /opt/ecom && BRANCH=code-deploy bash scripts/deploy.sh`
3. Script pulls, builds `backend` + `frontend` + `caddy`, runs health check

See `docs/vps_operations_runbook.md`.

---

## 📚 Useful Docs in `/docs`

| File | Topic |
|------|-------|
| `api_endpoints.md` | Full API reference |
| `system_architecture.md` | Scale architecture plan |
| `vps_operations_runbook.md` | VPS commands (disk, docker, logs) |
| `production_deployment_checklist.md` | Pre-deploy checklist |
| `backup_restore_guide.md` | DB backup & restore |
| `sendcloud_integration.md` | Sendcloud setup guide |
| `easy_product_adding_plan.md` | AI-assisted product adding |
| `ai_powered_ecommerce_plan.md` | AI feature roadmap |
| `returns-system-architecture.md` | Returns & refunds |
| `analytics_tracking_setup.md` | GA4, Meta, TikTok tracking |

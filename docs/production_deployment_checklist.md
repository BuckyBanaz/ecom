# 🚀 Production Deployment Checklist — Lampgigant E-Commerce

> **Last updated:** June 2026  
> Complete this checklist before going live. Mark each item ✅ when done.

---

## 1. 🖥️ Server / Infrastructure

- [ ] Server provisioned (VPS / Cloud — DigitalOcean, AWS EC2, Hetzner, etc.)
- [ ] Domain name pointed to server IP (A record in DNS)
- [ ] SSL certificate installed (Let's Encrypt via Certbot or Nginx SSL)
- [ ] Nginx reverse proxy configured:
  - Frontend → `yourdomain.com` (port 80/443 → Vite build)
  - Backend API → `api.yourdomain.com` or `yourdomain.com/api` (port 5000)
- [ ] PM2 or systemd configured to keep backend running (auto-restart on crash)
- [ ] PostgreSQL database server running and accessible (not exposed to public)
- [ ] Redis server running (for session caching)
- [ ] Firewall rules: Only ports 80, 443, 22 open to public

---

## 2. 🔐 Environment Variables — Backend (`.env`)

**Never commit `.env` to git. Set these directly on server.**

| Variable | Dev Value | Production Action |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` |
| `PORT` | `5000` | `5000` (behind Nginx) |
| `CLIENT_URL` | `http://localhost:8080` | **`https://yourdomain.com`** |
| `DATABASE_URL` | local postgres | **Production DB connection string** |
| `JWT_SECRET` | simple string | **Generate secure 64-char random string** |
| `JWT_EXPIRES_IN` | `7d` | `7d` (keep) |
| `REDIS_URL` | `redis://localhost:6379` | Production Redis URL |
| `ENABLE_REDIS` | `true` | `true` |

### Email / SMTP
| Variable | Production Action |
|---|---|
| `SMTP_HOST` | Your production SMTP host |
| `SMTP_PORT` | `465` or `587` |
| `SMTP_USER` | Production email address |
| `SMTP_PASS` | **Use app-specific password or SMTP credentials** |
| `SMTP_FROM_NAME` | `Lampgigant` |
| `SMTP_FROM_EMAIL` | `noreply@yourdomain.com` |
| `SMTP_ENABLE` | `true` |

### Stripe
| Variable | Production Action |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | **Replace test `pk_test_` with live `pk_live_`** |
| `STRIPE_SECRET_KEY` | **Replace test `sk_test_` with live `sk_live_`** |
| `STRIPE_WEBHOOK_SECRET` | Get from Stripe Dashboard → Developers → Webhooks |

### Sendcloud
| Variable | Production Action |
|---|---|
| `SENDCLOUD_ENABLED` | `true` |
| `SENDCLOUD_PUBLIC_KEY` | Keep (same for prod) |
| `SENDCLOUD_SECRET_KEY` | Keep (same for prod) |
| `SENDCLOUD_WEBHOOK_SECRET` | **Get from Sendcloud Panel → Settings → Integrations → Webhooks → Secret** |

---

## 3. 💳 Stripe — Production Setup

- [ ] Go to **Stripe Dashboard → Activate Live Mode** (submit business verification)
- [ ] Get live keys (`pk_live_*`, `sk_live_*`) and update `.env`
- [ ] Register **Webhook Endpoint** in Stripe Dashboard:
  - URL: `https://yourdomain.com/api/v1/payments/webhook`
  - Events to listen: `checkout.session.completed`, `payment_intent.payment_failed`
  - Copy **Webhook Signing Secret** → set as `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] Test a live payment of €0.50 to verify end-to-end flow
- [ ] Verify `order_confirmed` notification email arrives after successful payment

---

## 4. 📦 Sendcloud — Production Setup

- [ ] Login to **Sendcloud Panel** (panel.sendcloud.sc)
- [ ] Go to **Settings → Integrations → Webhooks**
- [ ] Add new webhook:
  - **URL:** `https://yourdomain.com/api/v1/webhooks/sendcloud`
  - **Events:** Select `parcel_status_changed` (and optionally all events)
  - Copy the **Webhook Secret** → set as `SENDCLOUD_WEBHOOK_SECRET` in `.env`
- [ ] Verify sender address is set up correctly in Sendcloud (Settings → Addresses → Sender)
- [ ] Create a **real test shipment** (not unstamped letter) with PostNL/DPD
  - Confirm order status updates flow through: `picked_up` → `in_transit` → `out_for_delivery` → `delivered`
  - Confirm `order_delivered` email with review link arrives on delivery

### Sendcloud Status IDs — Reference
| Status ID | Meaning | Our System Status |
|---|---|---|
| 1-3 | Announced / Sorting | `picked_up` |
| 13 | Carrier picked up parcel | `picked_up` |
| 4-5, 14 | In transit / Sorting center | `in_transit` |
| 6, 15 | Out for delivery | `out_for_delivery` |
| 11 | **Delivered** ✅ | `delivered` → Review email |
| 12, 17, 80 | Delivery attempted / At post office | `out_for_delivery` |
| 22, 93 | Return / Cancelled by carrier | No status change |

---

## 5. 🏗️ Build & Deploy Steps

### Backend
```bash
# On production server
cd /var/www/ecom/backend
git pull origin main
npm install --production
npx prisma migrate deploy       # Run migrations (NOT reset!)
npx prisma generate
npm run build
pm2 restart ecom-backend        # or: pm2 start dist/index.js --name ecom-backend
```

### Frontend
```bash
cd /var/www/ecom/frontend
git pull origin main
npm install
npm run build                   # Creates dist/ folder
# Nginx serves dist/ as static files
```

### First-Time Database Migration (never use seed in production)
```bash
# Run migrations only — DO NOT run prisma db seed in production
npx prisma migrate deploy
```

> ⚠️ **Never run `npm run prisma:seed` in production** — it will wipe existing data!

---

## 6. 🔒 Security Checklist

- [ ] `NODE_ENV=production` set in backend `.env`
- [ ] JWT_SECRET is a long random string (min 32 chars, ideally 64+)
  ```bash
  # Generate: 
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] `SENDCLOUD_WEBHOOK_SECRET` set (prevents fake delivery triggers)
- [ ] `STRIPE_WEBHOOK_SECRET` set (prevents fake payment triggers)
- [ ] Database not exposed on public port (only accessible locally or via VPN)
- [ ] `.env` file not in git repository (check `.gitignore`)
- [ ] CORS `CLIENT_URL` set to exact production domain (not wildcard `*`)
- [ ] Rate limiting considered for auth endpoints (brute force protection)
- [ ] All admin routes protected by `requireAdmin` middleware ✅ (already done)

---

## 7. 📊 Post-Deployment Verification

### Automated health check
```bash
curl https://yourdomain.com/health
# Expected: {"success":true,"status":"healthy",...}
```

### Manual flow tests
- [ ] Customer can register and receive verification email
- [ ] Customer can login and see dashboard
- [ ] Product listing loads from DB (not hardcoded)
- [ ] Add to cart → Checkout → Stripe payment completes
- [ ] `order_confirmed` email arrives with order + payment summary
- [ ] Admin can login at `/admin`
- [ ] Admin can view and update order status
- [ ] Order status update email arrives to customer
- [ ] Admin can create shipment → label generates
- [ ] `order_shipped` email arrives with tracking number
- [ ] (Sendcloud webhook) Delivered → `order_delivered` review email arrives
- [ ] Customer can write review from dashboard

### Admin panel checks
- [ ] `/admin/cms/email-templates` — All templates visible and editable
- [ ] `/admin/cms/email-templates` → Channel Configuration → Enable email channel globally
- [ ] `/admin` dashboard shows real orders count
- [ ] `/admin/orders` — Orders list loads correctly

---

## 8. 🔄 Ongoing Maintenance

- [ ] Set up daily database backups (pg_dump cronjob)
- [ ] Monitor PM2 logs: `pm2 logs ecom-backend`
- [ ] Monitor Nginx error logs: `/var/log/nginx/error.log`
- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime — free tiers available)
- [ ] Stripe: Check dashboard weekly for failed payments
- [ ] Sendcloud: Monitor parcel status in Sendcloud panel

---

## 9. 🧪 Testing Sendcloud Webhooks Locally (Dev)

To test Sendcloud webhooks on localhost before production:

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Expose your local backend
ngrok http 5000
# You'll get a URL like: https://abc123.ngrok.io

# 3. In Sendcloud Panel → Settings → Webhooks
# Add URL: https://abc123.ngrok.io/api/v1/webhooks/sendcloud

# 4. Create a real (non-unstamped) test shipment
# 5. Watch your backend logs for webhook events
```

> ⚠️ **Unstamped letters do NOT generate pickup/transit/delivery webhook events.**  
> You need a real stamped shipment (PostNL, DPD, etc.) to test the full webhook flow.

---

*Generated for Lampgigant E-Commerce Platform — June 2026*

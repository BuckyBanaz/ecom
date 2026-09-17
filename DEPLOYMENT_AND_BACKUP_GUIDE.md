# 🚀 Production Deployment, Backup & Rollback Guide

Is document me saari Git branches ki timeline, commits, backup recovery steps aur safe production deployment commands listed hain.

---

## 📅 Git Branches Status & Commit History (Latest to Oldest)

| Branch Name | Latest Commit | Date (IST) | Status / Purpose |
| :--- | :--- | :--- | :--- |
| **`version0.3`** *(Current / Latest)* | `7e5bcc4` | **17 Sep 2026** | **Current Work**: Inventory & Warehouse Management, Fast Barcode/Laser Scanner, Real-time Stock Capping, Low stock urgency badge. |
| **`version0.2`** | `c5db492` | **10 Sep 2026** | Previous stable version before scanner & warehouse refinements. |
| **`version0.1`** | `bc0d9de` | **02 Sep 2026** | Initial warehouse/admin redesign v1. |
| **`redesign_v0.2`** | `aa6fe47` | **25 Aug 2026** | Storefront UI Redesign phase 2. |
| **`redesign_v0.1`** | `5957565` | **11 Aug 2026** | Storefront UI Redesign phase 1. |
| **`code-deploy`** | `e67861f` | **08 Aug 2026** | Deployment stable snapshot. |
| **`v0.7`** | `644c5d8` | **28 Jul 2026** | SEO prerender + llms.txt improvements. |
| **`v0.6`** | `4f31db1` | **09 Jul 2026** | Feature updates. |
| **`v0.5`** | `5ca7269` | **07 Jul 2026** | Docker SEO prerender network fix. |
| **`v0.4`** | `a0827e8` | **04 Jul 2026** | Feature checkpoint. |
| **`v0.3`** | `3f036d0` | **04 Jul 2026** | Older checkpoint. |
| **`main`** | `b1ce098` | **23 Jun 2026** | Base production branch. |

---

## 🛡️ Backup & Rollback Safety Plan (Agar Kuch Fate Toh)

Agar new code me server par koi issue aaye, toh instant safe rollback ke liye:

### Safe Rollback Target: `origin/version0.2` ya `origin/code-deploy`

#### Rollback Commands (Server Terminal):
```bash
# 1. Jo bhi current branch hai usko checkout karke previous stable pe le jao
git fetch origin
git checkout version0.2

# 2. Dependencies aur Backend restart
cd backend
npm install
npm run build
pm2 restart ecom-backend

# 3. Frontend re-build
cd ../frontend
npm install
npm run build
```

---

## 🚀 Live Deployment Commands on Server (`root@srv1741393`)

### 1. Code Pull
```bash
cd /path/to/ecom
git fetch origin
git checkout version0.3
git pull origin version0.3
```

### 2. Backend DB Sync & Build
```bash
cd backend
npm install
npx prisma db push
npm run build
pm2 restart ecom-backend || pm2 start dist/server.js --name ecom-backend
```

### 3. Frontend Build
```bash
cd ../frontend
npm install
npm run build
```

### 4. Verification Check
```bash
# Check if PM2 backend is running healthy
pm2 status
pm2 logs ecom-backend --lines 30
```

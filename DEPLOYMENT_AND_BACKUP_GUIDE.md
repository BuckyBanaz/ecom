# 🚀 Production Deployment, Backup & Rollback Guide (Docker VPS)

Aapka server (**srv1741393** / `schipenster.com`) **Docker Compose** use karta hai (PM2 nahi). 
Is document me deployment, rollback, aur server management commands hain.

---

## 📅 Git Branches Status & Commit History (Latest to Oldest)

| Branch Name | Latest Commit | Date (IST) | Status / Purpose |
| :--- | :--- | :--- | :--- |
| **`version0.3`** 🌟 *(Current Live)* | `4ca89c9` | **17 Sep 2026** | **Live on Production**: Inventory & Warehouse, Fast Barcode/Laser Scanner, Real-time Stock Capping, Low stock badge. |
| **`version0.2`** 🛡️ *(Safe Backup 1)* | `c5db492` | **10 Sep 2026** | Stable baseline before scanner & warehouse changes. |
| **`version0.1`** | `bc0d9de` | **02 Sep 2026** | Initial warehouse/admin updates. |
| **`redesign_v0.2`** | `aa6fe47` | **25 Aug 2026** | Storefront UI Redesign phase 2. |
| **`redesign_v0.1`** | `5957565` | **11 Aug 2026** | Storefront UI Redesign phase 1. |
| **`code-deploy`** 🛡️ *(Safe Backup 2)* | `e67861f` | **08 Aug 2026** | Old tested deployment snapshot. |
| **`v0.7`** | `644c5d8` | **28 Jul 2026** | SEO prerender + llms.txt. |
| **`main`** | `b1ce098` | **23 Jun 2026** | Base production branch. |

---

## 🚀 Future Deploy Commands (VPS Terminal)

Jab bhi local se code push karo, server pe bas ye **ek command** run karni hoti hai:

```bash
cd /opt/ecom && git pull && BRANCH=version0.3 bash scripts/deploy.sh
```

Ye script automatically:
1. Latest code pull karta hai.
2. Docker images (`ecom-backend`, `ecom-frontend`) build karta hai.
3. Database migrations / schema sync run karta hai.
4. Containers restart karke health check verify karta hai (`api.schipenster.com` & `schipenster.com`).

---

## 🛡️ Rollback Steps (Agar Kabhi Issue Aaye)

Agar naye code me issue aaye aur purane stable code pe wapas jana ho:

```bash
cd /opt/ecom
git pull
BRANCH=version0.2 bash scripts/deploy.sh
```

---

## 🔍 Useful Server Monitoring Commands

```bash
# 1. Containers status check
docker compose -f docker-compose.prod.yml ps

# 2. Live backend logs dekhna
docker compose -f docker-compose.prod.yml logs -f --tail=50 backend

# 3. Live frontend / Caddy logs dekhna
docker compose -f docker-compose.prod.yml logs -f --tail=50 frontend caddy

# 4. Containers restart karna
docker compose -f docker-compose.prod.yml restart backend
```

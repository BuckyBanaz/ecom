# Backup & Restore Guide

This document explains how to create, download, store, and restore backups for the Schip & Ster e-commerce platform — from the **Admin → Backups** panel and from the command line on the server.

---

## 1. Overview

| What is backed up | File format | Where it lives after download |
|-------------------|-------------|-------------------------------|
| PostgreSQL database (products, orders, users, CMS, settings) | `.dump` | Your PC / cloud drive |
| Product images & uploads | `.tar.gz` | Your PC / cloud drive |
| Database + uploads together | `.tar.gz` (full) | Your PC / cloud drive |

Backups are **not** used in day-to-day operations. They are your safety net when:

- The server fails or is reinstalled
- Data is accidentally deleted
- You migrate to a new VPS
- You want a copy of production data on local dev

**Important:** `.env.production` (Stripe keys, JWT secret, DB password) is **not** included in backups. Copy that file manually and store it securely.

---

## 2. Admin Panel — Create & Download

### Access

1. Log in as **superadmin** or an admin with **Settings** permission
2. Open **Admin → Backups** (`/admin/backups`)

### Backup types

| Button | Creates | Typical size |
|--------|---------|--------------|
| **Database backup** | PostgreSQL custom dump | Tens of KB to several MB |
| **Files backup** | All files in `public/uploads` | Depends on image count |
| **Full backup** | One archive with DB dump + uploads | Sum of both |

### Steps

1. Click the backup type you need
2. Wait until the new row appears in the table (may take 10–60 seconds)
3. Check **Size** — must **not** be `0 B`
4. Click **Download** and save the file locally
5. Copy the file to Google Drive, OneDrive, or an external drive

### Retention

- Up to **20 backups** are kept on the server automatically
- Older backups are deleted when a new one is created
- Downloaded copies on your computer are never deleted by the app

---

## 3. Understanding Backup Files

### `.dump` (database)

- **Format:** PostgreSQL custom format (binary)
- **Not a text file** — opening it in VS Code or Notepad will look empty; that is normal
- **Valid if:** file size is greater than 0 bytes (typically 50 KB+ for a seeded store)
- **Restore with:** `pg_restore`

### `.tar.gz` (files / full)

- Standard compressed archive
- **Files backup:** product/category images and other uploaded media
- **Full backup:** contains `database.dump` and `uploads.tar.gz` inside

---

## 4. Recommended Schedule

| Frequency | Action |
|-----------|--------|
| Weekly | Database backup → download → save off-server |
| Monthly | Full backup → download → save off-server |
| Before major deploy | Quick database backup from admin |
| Monthly (optional) | Hostinger VPS snapshot (whole server) |

---

## 5. Restore — Local Development (Windows + Docker)

Prerequisites:

- Docker Desktop running
- Postgres container up: `docker ps` should show `ecom-postgres`

### 5.1 Restore database

Replace the path and filename with your actual backup file.

```powershell
# Copy dump into the postgres container
docker cp "C:\Users\Parikshit\Downloads\database-2026-06-10T05-33-42.dump" ecom-postgres:/tmp/restore.dump

# Restore (overwrites existing data in ecom_db)
docker exec ecom-postgres pg_restore -U postgres -d ecom_db --clean --if-exists /tmp/restore.dump

# Remove temp file inside container
docker exec ecom-postgres rm -f /tmp/restore.dump
```

Verify:

```powershell
docker exec ecom-postgres psql -U postgres -d ecom_db -c "SELECT COUNT(*) FROM \"Product\";"
```

Or open the admin panel and confirm products/orders are present.

### 5.2 Restore uploads (files backup)

```powershell
docker run --rm `
  -v ecom_backend_uploads:/data `
  -v "C:\Users\Parikshit\Downloads:/backup" `
  alpine tar xzf /backup/uploads-YYYY-MM-DD.tar.gz -C /data
```

> Volume name may differ. List volumes with: `docker volume ls`

---

## 6. Restore — Production VPS

Server: `/opt/ecom` · Postgres service: `postgres` in `docker-compose.prod.yml`

### 6.1 Upload backup from your PC

```powershell
scp "C:\Users\Parikshit\Downloads\database-2026-06-10T05-33-42.dump" root@187.124.21.137:/tmp/restore.dump
```

### 6.2 Restore database on VPS

```bash
cd /opt/ecom

# Copy dump into postgres container
docker compose -f docker-compose.prod.yml cp /tmp/restore.dump postgres:/tmp/restore.dump

# Restore
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U postgres -d ecom_db --clean --if-exists /tmp/restore.dump

# Restart backend
docker compose -f docker-compose.prod.yml restart backend

# Cleanup
docker compose -f docker-compose.prod.yml exec -T postgres rm -f /tmp/restore.dump
rm -f /tmp/restore.dump
```

### 6.3 Restore uploads on VPS

```bash
cd /opt/ecom

docker run --rm \
  -v ecom_backend_uploads:/data \
  -v /tmp:/backup \
  alpine tar xzf /backup/uploads-YYYY-MM-DD.tar.gz -C /data
```

### 6.4 Restore from full backup

```bash
mkdir -p /tmp/full-restore
tar xzf /tmp/full-YYYY-MM-DD.tar.gz -C /tmp/full-restore

# Then restore database.dump and uploads.tar.gz using steps 6.2 and 6.3
```

---

## 7. Manual Backup (CLI — without admin panel)

Useful for cron jobs or SSH-only access.

### Database

```bash
cd /opt/ecom
mkdir -p /opt/backups/db

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres -d ecom_db -F c \
  > /opt/backups/db/ecom_db_$(date +%Y%m%d).dump
```

### Uploads

```bash
docker run --rm \
  -v ecom_backend_uploads:/data:ro \
  -v /opt/backups/uploads:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

### Download backup to your PC

```powershell
scp root@187.124.21.137:/opt/backups/db/ecom_db_*.dump C:\Users\Parikshit\Desktop\backups\
```

---

## 8. Troubleshooting

### Backup shows `0 B` in admin

- **Cause:** Dump failed silently (common on Windows when `pg_dump` is not installed locally)
- **Fix:** Ensure Docker is running and `ecom-postgres` container is up; restart backend after pulling latest code (uses `docker exec` + `docker cp` internally)
- Delete the 0 B file and create a new backup

### `spawn pg_dump ENOENT` (local dev)

- **Cause:** PostgreSQL client tools not installed on Windows
- **Fix:** Backend falls back to Docker automatically if the postgres container is running
- Alternative: install [PostgreSQL for Windows](https://www.postgresql.org/download/windows/) and add `pg_dump` to PATH

### `Database backup is empty` error

- Postgres container not running, wrong password in `DATABASE_URL`, or wrong database name
- Check: `docker exec ecom-postgres pg_isready -U postgres`

### Download works but restore fails

- Ensure you restore to the **same major Postgres version** (15.x)
- Use `pg_restore` for `.dump` files, not `psql`
- On production, confirm `POSTGRES_USER` / `POSTGRES_DB` in `.env.production` match your dump

### Files backup is very small

- Normal if few images are uploaded
- Empty uploads folder may still produce a small `.tar.gz` (not 0 B)

---

## 9. Technical Reference (Developers)

### Backend files

| File | Purpose |
|------|---------|
| `backend/src/services/backupService.ts` | Creates/list/deletes backups |
| `backend/src/controllers/backupController.ts` | HTTP handlers |
| `backend/src/routes/backupRoutes.ts` | Routes under `/api/v1/admin/backups` |
| `frontend/src/pages/admin/AdminBackups.tsx` | Admin UI |

### API endpoints (admin JWT required, `settings` permission)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/backups` | List backups |
| `POST` | `/api/v1/admin/backups` | Create backup `{ "type": "database" \| "uploads" \| "full" }` |
| `GET` | `/api/v1/admin/backups/:filename/download` | Download file |
| `DELETE` | `/api/v1/admin/backups/:filename` | Delete backup from server |

### Storage on server

- Path inside backend container: `/app/backups`
- Docker volume (production): `backups_data` mounted in `docker-compose.prod.yml`
- Uploads source: `backend_uploads` volume → `/app/public/uploads`

### Environment variables (optional)

| Variable | Description |
|----------|-------------|
| `BACKUP_POSTGRES_CONTAINER` | Docker container name for local fallback (default: `ecom-postgres`) |
| `PG_DUMP_PATH` | Custom path to `pg_dump` binary |

### Deploy note

After adding or updating backup code, rebuild the backend image (includes `postgresql16-client`):

```bash
cd /opt/ecom
git pull
docker compose -f docker-compose.prod.yml up -d --build backend frontend
```

---

## 10. Quick Reference Card

```
CREATE  → Admin → Backups → Database backup → Download
STORE   → Google Drive / external disk (not only on server)
CHECK   → File size > 0 B
RESTORE → docker cp dump → pg_restore --clean --if-exists
SECRETS → Copy .env.production manually (not in backup)
```

---

*Last updated: June 2026 — matches Admin Backups feature in `v0.0` / `main`.*

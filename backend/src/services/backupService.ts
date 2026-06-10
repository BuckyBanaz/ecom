import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { env } from "../config/env";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BACKUPS = 20;

const DOCKER_CONTAINER_CANDIDATES = [
  process.env.BACKUP_POSTGRES_CONTAINER,
  "ecom-postgres",
  "ecom-postgres-1",
].filter((name): name is string => Boolean(name));

export type BackupType = "database" | "uploads" | "full";

export interface BackupEntry {
  id: string;
  type: BackupType;
  filename: string;
  size: number;
  createdAt: string;
}

const parseDbUrl = (url: string) => {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
};

const isPgDumpMissing = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as NodeJS.ErrnoException;
  return err.code === "ENOENT" || String(err.message || "").includes("ENOENT");
};

const runCommand = (
  cmd: string,
  args: string[],
  options: { env?: Record<string, string> } = {}
): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env: { ...process.env, ...options.env } });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${cmd} failed with exit code ${code}`));
    });
  });

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const ensureBackupDir = async () => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
};

const inferType = (filename: string): BackupType => {
  if (filename.startsWith("database-")) return "database";
  if (filename.startsWith("uploads-")) return "uploads";
  return "full";
};

const assertNonEmptyFile = async (filePath: string, label: string) => {
  const stat = await fs.stat(filePath);
  if (stat.size === 0) {
    await fs.unlink(filePath).catch(() => undefined);
    throw new Error(`${label} backup is empty. Check database connection and credentials.`);
  }
};

const toEntry = async (filename: string): Promise<BackupEntry> => {
  const filePath = path.join(BACKUP_DIR, filename);
  const stat = await fs.stat(filePath);
  return {
    id: filename,
    type: inferType(filename),
    filename,
    size: stat.size,
    createdAt: stat.mtime.toISOString(),
  };
};

export const listBackups = async (): Promise<BackupEntry[]> => {
  await ensureBackupDir();
  const files = await fs.readdir(BACKUP_DIR);
  const entries: BackupEntry[] = [];

  for (const filename of files) {
    if (filename.startsWith("tmp-")) continue;
    const filePath = path.join(BACKUP_DIR, filename);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue;
    entries.push({
      id: filename,
      type: inferType(filename),
      filename,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    });
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const pruneOldBackups = async () => {
  const backups = await listBackups();
  if (backups.length <= MAX_BACKUPS) return;
  for (const backup of backups.slice(MAX_BACKUPS)) {
    await fs.unlink(path.join(BACKUP_DIR, backup.filename)).catch(() => undefined);
  }
};

const dumpDatabaseLocal = async (outPath: string, db: ReturnType<typeof parseDbUrl>) => {
  const pgDump = process.env.PG_DUMP_PATH || "pg_dump";
  await runCommand(
    pgDump,
    ["-h", db.host, "-p", db.port, "-U", db.user, "-d", db.database, "-F", "c", "-f", outPath],
    { env: { PGPASSWORD: db.password } }
  );
  await assertNonEmptyFile(outPath, "Database");
};

const dumpDatabaseViaDocker = async (outPath: string, db: ReturnType<typeof parseDbUrl>) => {
  let lastError: Error | null = null;

  for (const container of DOCKER_CONTAINER_CANDIDATES) {
    const containerTmp = `/tmp/ecom-db-${Date.now()}.dump`;
    try {
      await runCommand("docker", [
        "exec",
        "-e",
        `PGPASSWORD=${db.password}`,
        container,
        "pg_dump",
        "-U",
        db.user,
        "-d",
        db.database,
        "-F",
        "c",
        "-f",
        containerTmp,
      ]);

      await runCommand("docker", ["cp", `${container}:${containerTmp}`, outPath]);
      await assertNonEmptyFile(outPath, "Database");

      await runCommand("docker", ["exec", container, "rm", "-f", containerTmp]).catch(() => undefined);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await runCommand("docker", ["exec", container, "rm", "-f", containerTmp]).catch(() => undefined);
      await fs.unlink(outPath).catch(() => undefined);
    }
  }

  throw new Error(
    lastError?.message ||
      "Database backup failed. Ensure Docker is running and the postgres container is up."
  );
};

const dumpDatabase = async (outPath: string) => {
  const db = parseDbUrl(env.DATABASE_URL);

  try {
    await dumpDatabaseLocal(outPath, db);
  } catch (error) {
    const useDockerFallback =
      isPgDumpMissing(error) || db.host === "localhost" || db.host === "127.0.0.1";

    if (!useDockerFallback) throw error;
    await dumpDatabaseViaDocker(outPath, db);
  }
};

const archiveUploads = async (outPath: string) => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await runCommand("tar", ["czf", outPath, "-C", UPLOADS_DIR, "."]);
  await assertNonEmptyFile(outPath, "Files");
};

export const createBackup = async (type: BackupType): Promise<BackupEntry> => {
  await ensureBackupDir();
  const ts = timestamp();

  if (type === "database") {
    const filename = `database-${ts}.dump`;
    const outPath = path.join(BACKUP_DIR, filename);
    await dumpDatabase(outPath);
    await pruneOldBackups();
    return toEntry(filename);
  }

  if (type === "uploads") {
    const filename = `uploads-${ts}.tar.gz`;
    const outPath = path.join(BACKUP_DIR, filename);
    await archiveUploads(outPath);
    await pruneOldBackups();
    return toEntry(filename);
  }

  const filename = `full-${ts}.tar.gz`;
  const outPath = path.join(BACKUP_DIR, filename);
  const tmpDir = path.join(BACKUP_DIR, `tmp-${ts}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    await dumpDatabase(path.join(tmpDir, "database.dump"));
    await archiveUploads(path.join(tmpDir, "uploads.tar.gz"));
    await runCommand("tar", ["czf", outPath, "-C", tmpDir, "database.dump", "uploads.tar.gz"]);
    await assertNonEmptyFile(outPath, "Full");
    await pruneOldBackups();
    return toEntry(filename);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

export const getBackupPath = (id: string): string => {
  const safe = path.basename(id);
  const resolved = path.join(BACKUP_DIR, safe);
  if (!resolved.startsWith(BACKUP_DIR)) {
    throw new Error("Invalid backup path");
  }
  return resolved;
};

export const deleteBackup = async (id: string): Promise<void> => {
  const filePath = getBackupPath(id);
  await fs.unlink(filePath);
};

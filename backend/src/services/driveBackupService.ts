/**
 * Scheduled backups uploaded to the shop owner's Google Drive.
 *
 * Google: OAuth "Web application" client (personal Gmail Drives give service accounts no storage), scope
 * drive.file — the app only sees the files and folder it created itself. Client id/secret and the refresh
 * token live in the env file like the SMTP credentials; schedule settings and run state live in cms_config.
 */
import fs from "fs";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { saveSettings } from "./settingsStore";
import { createBackup, deleteBackup, getBackupPath, type BackupType } from "./backupService";
import { emailService } from "./emailService";

const SCOPES = ["https://www.googleapis.com/auth/drive.file", "openid", "email"];
const FOLDER_NAME = "Schip & Ster Backups";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SETTINGS_KEY = "backup_schedule_settings";
const STATE_KEY = "backup_schedule_state";
const TIME_ZONE = "Europe/Amsterdam";
export const MASKED_SECRET = "••••••••";

export interface ScheduleSettings {
  enabled: boolean;
  frequency: "daily" | "weekly";
  /** "HH:MM", Amsterdam time */
  time: string;
  /** 0 = Sunday … 6 = Saturday (weekly only) */
  weekday: number;
  type: BackupType;
  keepDrive: number;
  keepLocal: number;
}

export interface ScheduleState {
  status?: "running" | "success" | "failed";
  lastRunAt?: string;
  lastFinishedAt?: string;
  trigger?: "schedule" | "manual";
  message?: string;
  lastBackup?: { filename: string; size: number; driveFileId?: string; driveLink?: string };
  /** Last schedule slot handled ("2026-11-11" daily / same for weekly), so a slot runs once */
  lastSlot?: string;
  /** Local files made by the schedule — only these are pruned (manual backups are never touched) */
  scheduledFiles?: string[];
}

export const DEFAULT_SETTINGS: ScheduleSettings = {
  enabled: false,
  frequency: "daily",
  time: "03:00",
  weekday: 0,
  type: "full",
  keepDrive: 3,
  keepLocal: 3,
};

// ---------------------------------------------------------------- settings / state

async function readConfig<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.cmsConfig.findUnique({ where: { key } });
  return { ...fallback, ...((row?.value as object) || {}) } as T;
}

async function writeConfig(key: string, value: object) {
  await prisma.cmsConfig.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } });
}

export const getScheduleSettings = () => readConfig<ScheduleSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
export const getScheduleState = () => readConfig<ScheduleState>(STATE_KEY, {});
const patchState = async (patch: Partial<ScheduleState>) => writeConfig(STATE_KEY, { ...(await getScheduleState()), ...patch });

export function validateScheduleSettings(input: any): { settings?: ScheduleSettings; error?: string } {
  const s: ScheduleSettings = {
    enabled: input?.enabled === true,
    frequency: input?.frequency === "weekly" ? "weekly" : "daily",
    time: String(input?.time ?? DEFAULT_SETTINGS.time),
    weekday: Number(input?.weekday ?? 0),
    type: ["database", "uploads", "full"].includes(input?.type) ? input.type : "full",
    keepDrive: Number(input?.keepDrive ?? DEFAULT_SETTINGS.keepDrive),
    keepLocal: Number(input?.keepLocal ?? DEFAULT_SETTINGS.keepLocal),
  };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) return { error: "Time must be HH:MM (24h)" };
  if (!Number.isInteger(s.weekday) || s.weekday < 0 || s.weekday > 6) return { error: "Invalid weekday" };
  if (!Number.isInteger(s.keepDrive) || s.keepDrive < 1 || s.keepDrive > 100) return { error: "Keep on Drive must be 1-100" };
  if (!Number.isInteger(s.keepLocal) || s.keepLocal < 1 || s.keepLocal > 20) return { error: "Keep on server must be 1-20" };
  return { settings: s };
}

/** Amsterdam wall-clock parts for "now" */
function amsterdamNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, weekday };
}

/** Slot that is due now (time reached today, and the right weekday for weekly), or null */
function dueSlot(settings: ScheduleSettings, now = amsterdamNow()): string | null {
  if (settings.frequency === "weekly" && now.weekday !== settings.weekday) return null;
  return now.time >= settings.time ? now.day : null;
}

export async function saveScheduleSettings(settings: ScheduleSettings): Promise<ScheduleSettings> {
  const previous = await getScheduleSettings();
  await writeConfig(SETTINGS_KEY, settings);
  // Enabling / moving the time to earlier today must not fire a backup immediately: first run is the next slot
  const slot = dueSlot(settings);
  const changedTiming = !previous.enabled || previous.time !== settings.time || previous.frequency !== settings.frequency || previous.weekday !== settings.weekday;
  if (settings.enabled && changedTiming && slot) await patchState({ lastSlot: slot });
  return settings;
}

// ---------------------------------------------------------------- Google Drive connection

export const getRedirectUri = () =>
  process.env.GOOGLE_DRIVE_REDIRECT_URI || `${env.API_URL.replace(/\/+$/, "")}/api/v1/admin/backups/google/callback`;

function oauthClient() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google Drive client ID / secret are not set");
  const client = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
  return client;
}

export function getDriveStatus() {
  return {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ? MASKED_SECRET : "",
    configured: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET),
    connected: Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN),
    accountEmail: process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL || "",
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
    folderName: FOLDER_NAME,
    redirectUri: getRedirectUri(),
  };
}

export async function saveDriveCredentials(clientId: string, clientSecret: string) {
  const updates: Record<string, string> = { GOOGLE_DRIVE_CLIENT_ID: clientId.trim() };
  if (clientSecret && clientSecret !== MASKED_SECRET) updates.GOOGLE_DRIVE_CLIENT_SECRET = clientSecret.trim();
  // A different OAuth client invalidates the old token
  if (process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_ID !== updates.GOOGLE_DRIVE_CLIENT_ID) {
    Object.assign(updates, { GOOGLE_DRIVE_REFRESH_TOKEN: "", GOOGLE_DRIVE_ACCOUNT_EMAIL: "", GOOGLE_DRIVE_FOLDER_ID: "" });
  }
  await saveSettings(updates);
}

/** Google consent URL; `state` is a short-lived signed token so the public callback can trust the request */
export function getAuthUrl(adminId: string, returnOrigin: string): string {
  const state = jwt.sign({ purpose: "drive-connect", adminId, returnOrigin }, env.JWT_SECRET, { expiresIn: "15m" });
  return oauthClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES, state, include_granted_scopes: true });
}

export function verifyState(state: string): { returnOrigin: string } {
  const payload = jwt.verify(state, env.JWT_SECRET) as any;
  if (payload?.purpose !== "drive-connect") throw new Error("Invalid state");
  return { returnOrigin: String(payload.returnOrigin || "") };
}

async function ensureFolder(client: ReturnType<typeof oauthClient>): Promise<string> {
  const drive = google.drive({ version: "v3", auth: client });
  const found = await drive.files.list({
    q: `name = '${FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await drive.files.create({ requestBody: { name: FOLDER_NAME, mimeType: FOLDER_MIME }, fields: "id" });
  return created.data.id as string;
}

export async function completeConnection(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token — remove the app's access in your Google account and connect again");
  client.setCredentials(tokens);
  const { data } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
  const folderId = await ensureFolder(client);
  await saveSettings({
    GOOGLE_DRIVE_REFRESH_TOKEN: tokens.refresh_token,
    GOOGLE_DRIVE_ACCOUNT_EMAIL: data.email || "",
    GOOGLE_DRIVE_FOLDER_ID: folderId,
  });
  return { email: data.email || "", folderId };
}

export async function disconnectDrive() {
  try {
    if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) await oauthClient().revokeToken(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
  } catch (err: any) {
    console.warn("[DriveBackup] Token revoke failed (continuing):", err?.message || err);
  }
  await saveSettings({ GOOGLE_DRIVE_REFRESH_TOKEN: "", GOOGLE_DRIVE_ACCOUNT_EMAIL: "", GOOGLE_DRIVE_FOLDER_ID: "" });
}

async function uploadToDrive(filePath: string, filename: string) {
  const client = oauthClient();
  const drive = google.drive({ version: "v3", auth: client });
  const upload = (folderId: string) =>
    drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType: filename.endsWith(".dump") ? "application/octet-stream" : "application/gzip", body: fs.createReadStream(filePath) },
      fields: "id, webViewLink, size",
    });
  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || (await ensureFolder(client));
  try {
    return { ...(await upload(folderId)).data, folderId };
  } catch (err: any) {
    // Folder deleted in Drive: make a new one and retry once
    if (err?.code !== 404) throw err;
    folderId = await ensureFolder(client);
    await saveSettings({ GOOGLE_DRIVE_FOLDER_ID: folderId });
    return { ...(await upload(folderId)).data, folderId };
  }
}

/**
 * Keeps the newest `keep` backups in the Drive folder (rotation: the 4th replaces the 1st, …). Older ones are
 * deleted for good — trashed files still count against the Drive quota. Runs after the new upload succeeded, so
 * there are never fewer than `keep` good backups.
 */
async function pruneDrive(folderId: string, keep: number) {
  const drive = google.drive({ version: "v3", auth: oauthClient() });
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`,
    orderBy: "createdTime desc",
    fields: "files(id, name)",
    pageSize: 200,
  });
  for (const file of (data.files || []).slice(keep)) {
    await drive.files.delete({ fileId: file.id as string });
  }
}

// ---------------------------------------------------------------- running a backup

let running = false;
export const isBackupRunning = () => running;

async function notifyFailure(message: string) {
  const to = process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL;
  if (!to) return;
  await emailService
    .sendEmail({
      to,
      subject: "Backup failed - Schip & Ster",
      html: `<p>The scheduled backup could not be completed.</p><p><strong>Reason:</strong> ${message.replace(/</g, "&lt;")}</p><p>Open Admin &rarr; Backups to check the settings or run it again.</p>`,
    })
    .catch((err) => console.error("[DriveBackup] Failure email not sent:", err?.message || err));
}

/** Creates a backup, uploads it to Drive and prunes old copies. Never throws. */
export async function runBackupToDrive(trigger: "schedule" | "manual", slot?: string): Promise<ScheduleState> {
  if (running) return getScheduleState();
  running = true;
  const settings = await getScheduleSettings();
  await patchState({ status: "running", trigger, lastRunAt: new Date().toISOString(), message: undefined, ...(slot ? { lastSlot: slot } : {}) });
  let backupFile: string | undefined;
  try {
    const entry = await createBackup(settings.type);
    backupFile = entry.filename;

    // Server copy: keep only the newest `keepLocal` scheduled backups
    const state = await getScheduleState();
    const scheduledFiles = [entry.filename, ...(state.scheduledFiles || []).filter((f) => f !== entry.filename)];
    for (const old of scheduledFiles.slice(settings.keepLocal)) await deleteBackup(old).catch(() => undefined);
    await patchState({ scheduledFiles: scheduledFiles.slice(0, settings.keepLocal) });

    if (!process.env.GOOGLE_DRIVE_REFRESH_TOKEN) throw new Error("Google Drive is not connected — the backup was kept on the server only");
    const uploaded = await uploadToDrive(getBackupPath(entry.filename), `schipenster-backup-${entry.filename}`);
    await pruneDrive(uploaded.folderId, settings.keepDrive);

    const done: Partial<ScheduleState> = {
      status: "success",
      lastFinishedAt: new Date().toISOString(),
      message: undefined,
      lastBackup: { filename: entry.filename, size: entry.size, driveFileId: uploaded.id || undefined, driveLink: uploaded.webViewLink || undefined },
    };
    await patchState(done);
    console.log(`[DriveBackup] ${entry.filename} (${entry.size} bytes) uploaded to Google Drive`);
  } catch (err: any) {
    const message = err?.response?.data?.error_description || err?.errors?.[0]?.message || err?.message || String(err);
    console.error("[DriveBackup] Failed:", message);
    await patchState({
      status: "failed",
      lastFinishedAt: new Date().toISOString(),
      message,
      ...(backupFile ? { lastBackup: { filename: backupFile, size: 0 } } : {}),
    });
    await notifyFailure(message);
  } finally {
    running = false;
  }
  return getScheduleState();
}

/** Checks every minute whether a scheduled backup is due */
export function startBackupScheduler() {
  const tick = async () => {
    try {
      const settings = await getScheduleSettings();
      if (!settings.enabled || running) return;
      const slot = dueSlot(settings);
      if (!slot) return;
      const state = await getScheduleState();
      if (state.lastSlot === slot) return;
      await runBackupToDrive("schedule", slot);
    } catch (err: any) {
      console.warn("[DriveBackup] Scheduler tick skipped:", err?.message || err);
    }
  };
  const timer = setInterval(tick, 60 * 1000);
  timer.unref?.();
  return timer;
}

// exported for tests
export const __test = { dueSlot, amsterdamNow };

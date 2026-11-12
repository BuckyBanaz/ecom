import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Cloud, Copy, ExternalLink, Loader2, Play, Unplug, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { backupsRepository } from "@/client/apiClient";

type BackupType = "database" | "uploads" | "full";

interface ScheduleSettings {
  enabled: boolean;
  frequency: "daily" | "weekly";
  time: string;
  weekday: number;
  type: BackupType;
  keepDrive: number;
  keepLocal: number;
}

interface ScheduleState {
  status?: "running" | "success" | "failed";
  running?: boolean;
  lastRunAt?: string;
  lastFinishedAt?: string;
  trigger?: "schedule" | "manual";
  message?: string;
  lastBackup?: { filename: string; size: number; driveLink?: string };
}

interface DriveStatus {
  clientId: string;
  clientSecret: string;
  configured: boolean;
  connected: boolean;
  accountEmail: string;
  folderName: string;
  redirectUri: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/** Admin → Backups: connect Google Drive and schedule automatic backups that are uploaded there */
export function DriveBackupPanel({ onBackupFinished }: { onBackupFinished: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [state, setState] = useState<ScheduleState>({});
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [editingKeys, setEditingKeys] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const wasRunning = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await backupsRepository.getSchedule();
      setSettings(res.settings);
      setState(res.state || {});
      setDrive(res.drive);
      setClientId(res.drive?.clientId || "");
      setClientSecret(res.drive?.clientSecret || "");
      return res.state as ScheduleState;
    } catch (err: any) {
      toast.error(err?.message || t("admin_backups.drive.toast_load_failed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    // Back from Google's consent screen
    const params = new URLSearchParams(window.location.search);
    const result = params.get("drive");
    if (result) {
      if (result === "connected") toast.success(t("admin_backups.drive.toast_connected", { email: params.get("email") || "" }));
      else toast.error(t("admin_backups.drive.toast_connect_failed", { message: params.get("message") || "" }));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [load, t]);

  // While a backup runs, poll its state; refresh the backup list when it finishes
  useEffect(() => {
    // The server's in-memory flag is the truth; a stored "running" without it was cut off by a restart
    const running = !!state.running;
    if (running) wasRunning.current = true;
    if (!running) {
      if (wasRunning.current) {
        wasRunning.current = false;
        onBackupFinished();
        if (state.status === "success") toast.success(t("admin_backups.drive.toast_run_success"));
        else if (state.status === "failed") toast.error(t("admin_backups.drive.toast_run_failed", { message: state.message || "" }));
      }
      return;
    }
    const timer = setTimeout(load, 3000);
    return () => clearTimeout(timer);
  }, [state, load, onBackupFinished, t]);

  const saveKeys = async () => {
    setBusy("keys");
    try {
      const res = await backupsRepository.saveDriveCredentials(clientId, clientSecret);
      setDrive(res.drive);
      setClientSecret(res.drive.clientSecret);
      setEditingKeys(false);
      toast.success(t("admin_backups.drive.toast_keys_saved"));
    } catch (err: any) {
      toast.error(err?.message || t("admin_backups.drive.toast_save_failed"));
    } finally {
      setBusy(null);
    }
  };

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await backupsRepository.getDriveAuthUrl(window.location.origin);
      window.location.href = res.url;
    } catch (err: any) {
      toast.error(err?.message || t("admin_backups.drive.toast_connect_failed", { message: "" }));
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm(t("admin_backups.drive.confirm_disconnect"))) return;
    setBusy("disconnect");
    try {
      const res = await backupsRepository.disconnectDrive();
      setDrive(res.drive);
      toast.success(t("admin_backups.drive.toast_disconnected"));
    } catch (err: any) {
      toast.error(err?.message || t("admin_backups.drive.toast_save_failed"));
    } finally {
      setBusy(null);
    }
  };

  const saveSchedule = async () => {
    if (!settings) return;
    setBusy("schedule");
    try {
      const res = await backupsRepository.saveSchedule(settings as unknown as Record<string, unknown>);
      setSettings(res.settings);
      toast.success(t("admin_backups.drive.toast_schedule_saved"));
    } catch (err: any) {
      toast.error(err?.message || t("admin_backups.drive.toast_save_failed"));
    } finally {
      setBusy(null);
    }
  };

  const runNow = async () => {
    setBusy("run");
    try {
      await backupsRepository.runScheduledNow();
      toast.info(t("admin_backups.drive.toast_run_started"));
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("admin_backups.drive.toast_run_failed", { message: "" }));
    } finally {
      setBusy(null);
    }
  };

  const copyRedirect = async () => {
    if (!drive) return;
    try {
      await navigator.clipboard.writeText(drive.redirectUri);
      toast.success(t("admin_backups.drive.copied"));
    } catch {
      /* clipboard blocked: the URI is shown to copy by hand */
    }
  };

  if (loading || !settings || !drive) {
    return (
      <div className="flex justify-center rounded-xl border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const running = !!state.running;
  const set = <K extends keyof ScheduleSettings>(key: K, value: ScheduleSettings[K]) => setSettings({ ...settings, [key]: value });
  const showKeyForm = !drive.configured || editingKeys;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Google Drive connection */}
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Cloud className="h-5 w-5 text-sky-500" />
              {t("admin_backups.drive.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin_backups.drive.subtitle", { folder: drive.folderName })}</p>
          </div>
          {drive.connected ? (
            <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600">{t("admin_backups.drive.connected")}</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">{t("admin_backups.drive.not_connected")}</Badge>
          )}
        </div>

        {drive.connected && (
          <p className="text-sm">
            {t("admin_backups.drive.connected_as")} <strong>{drive.accountEmail}</strong>
          </p>
        )}

        {showKeyForm ? (
          <div className="space-y-3">
            <div>
              <Label>{t("admin_backups.drive.client_id")}</Label>
              <Input className="mt-1" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234-abc.apps.googleusercontent.com" />
            </div>
            <div>
              <Label>{t("admin_backups.drive.client_secret")}</Label>
              <Input className="mt-1" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="GOCSPX-…" />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-1 text-muted-foreground">{t("admin_backups.drive.redirect_hint")}</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all">{drive.redirectUri}</code>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={copyRedirect} title={t("admin_backups.drive.copy")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={saveKeys} disabled={busy === "keys" || !clientId.trim() || !clientSecret.trim()} className="rounded-full">
                {busy === "keys" && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("admin_backups.drive.save_keys")}
              </Button>
              {editingKeys ? (
                <Button variant="ghost" className="rounded-full" onClick={() => setEditingKeys(false)}>
                  {t("common.cancel")}
                </Button>
              ) : (
                // Visible from the start so it is clear what comes next; usable once the keys are saved
                <Button variant="outline" className="rounded-full" disabled title={t("admin_backups.drive.connect_after_save")}>
                  <Cloud className="h-4 w-4" />
                  {t("admin_backups.drive.connect")}
                </Button>
              )}
            </div>
            {!editingKeys && <p className="text-xs text-muted-foreground">{t("admin_backups.drive.steps")}</p>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {drive.connected ? (
              <Button variant="outline" className="rounded-full" onClick={disconnect} disabled={busy === "disconnect"}>
                <Unplug className="h-4 w-4" />
                {t("admin_backups.drive.disconnect")}
              </Button>
            ) : (
              <Button className="rounded-full" onClick={connect} disabled={busy === "connect"}>
                {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                {t("admin_backups.drive.connect")}
              </Button>
            )}
            <Button variant="ghost" className="rounded-full" onClick={() => setEditingKeys(true)}>
              {t("admin_backups.drive.edit_keys")}
            </Button>
          </div>
        )}
      </section>

      {/* Schedule */}
      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarClock className="h-5 w-5 text-primary" />
            {t("admin_backups.drive.schedule_title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin_backups.drive.schedule_subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="backup-schedule-enabled" checked={settings.enabled} onCheckedChange={(v) => set("enabled", v)} />
          <Label htmlFor="backup-schedule-enabled">{t("admin_backups.drive.enable")}</Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("admin_backups.drive.frequency")}</Label>
            <Select value={settings.frequency} onValueChange={(v) => set("frequency", v as ScheduleSettings["frequency"])}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("admin_backups.drive.daily")}</SelectItem>
                <SelectItem value="weekly">{t("admin_backups.drive.weekly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {settings.frequency === "weekly" ? (
            <div>
              <Label>{t("admin_backups.drive.weekday")}</Label>
              <Select value={String(settings.weekday)} onValueChange={(v) => set("weekday", Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{t(`admin_backups.drive.day_${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div />
          )}
          <div>
            <Label>{t("admin_backups.drive.time")}</Label>
            <Input className="mt-1" type="time" value={settings.time} onChange={(e) => set("time", e.target.value)} />
          </div>
          <div>
            <Label>{t("admin_backups.drive.type")}</Label>
            <Select value={settings.type} onValueChange={(v) => set("type", v as BackupType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{t("admin_backups.type_full")}</SelectItem>
                <SelectItem value="database">{t("admin_backups.type_database")}</SelectItem>
                <SelectItem value="uploads">{t("admin_backups.type_uploads")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin_backups.drive.keep_drive")}</Label>
            <Input className="mt-1" type="number" min={1} max={100} value={settings.keepDrive} onChange={(e) => set("keepDrive", Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("admin_backups.drive.keep_local")}</Label>
            <Input className="mt-1" type="number" min={1} max={20} value={settings.keepLocal} onChange={(e) => set("keepLocal", Number(e.target.value))} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("admin_backups.drive.timezone_hint")}</p>

        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full" onClick={saveSchedule} disabled={busy === "schedule"}>
            {busy === "schedule" && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("admin_backups.drive.save_schedule")}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={runNow} disabled={running || busy === "run"}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? t("admin_backups.drive.running") : t("admin_backups.drive.run_now")}
          </Button>
        </div>

        {/* Last run */}
        {state.lastRunAt && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : state.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="font-medium">
                {running
                  ? t("admin_backups.drive.status_running")
                  : state.status === "success"
                  ? t("admin_backups.drive.status_success")
                  : state.status === "running"
                  ? t("admin_backups.drive.status_interrupted")
                  : t("admin_backups.drive.status_failed")}
              </span>
              <span className="text-muted-foreground">· {format(new Date(state.lastFinishedAt || state.lastRunAt), "dd MMM yyyy, HH:mm")}</span>
            </div>
            {!running && state.message && <p className="mt-1 text-xs text-destructive">{state.message}</p>}
            {!running && state.status === "success" && state.lastBackup?.driveLink && (
              <a href={state.lastBackup.driveLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2">
                {state.lastBackup.filename}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

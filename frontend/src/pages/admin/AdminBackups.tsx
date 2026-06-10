import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Database, Download, FolderArchive, HardDrive, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { backupsRepository } from "@/client/apiClient";

type BackupType = "database" | "uploads" | "full";

interface BackupEntry {
  id: string;
  type: BackupType;
  filename: string;
  size: number;
  createdAt: string;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeVariant = (type: BackupType) => {
  if (type === "database") return "default" as const;
  if (type === "uploads") return "secondary" as const;
  return "outline" as const;
};

export default function AdminBackups() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<BackupType | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await backupsRepository.list();
      if (res.success) {
        setBackups(res.backups || []);
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_backups.toast_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async (type: BackupType) => {
    setCreating(type);
    try {
      const res = await backupsRepository.create(type);
      if (res.success) {
        toast.success(t(`admin_backups.toast_created_${type}`));
        await fetchBackups();
      }
    } catch (err: any) {
      toast.error(err.message || t("admin_backups.toast_create_failed"));
    } finally {
      setCreating(null);
    }
  };

  const handleDownload = async (backup: BackupEntry) => {
    setDownloading(backup.id);
    try {
      await backupsRepository.download(backup.id, backup.filename);
      toast.success(t("admin_backups.toast_download_started"));
    } catch (err: any) {
      toast.error(err.message || t("admin_backups.toast_download_failed"));
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (backup: BackupEntry) => {
    if (!window.confirm(t("admin_backups.confirm_delete", { name: backup.filename }))) return;
    try {
      await backupsRepository.remove(backup.id);
      toast.success(t("admin_backups.toast_deleted"));
      fetchBackups();
    } catch (err: any) {
      toast.error(err.message || t("admin_backups.toast_delete_failed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HardDrive className="h-6 w-6" />
            {t("admin_backups.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin_backups.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin_backups.refresh")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          onClick={() => handleCreate("database")}
          disabled={!!creating}
          className="h-auto flex-col items-start gap-2 py-4 px-4"
        >
          <Database className="h-5 w-5" />
          <span className="font-semibold">{t("admin_backups.create_database")}</span>
          <span className="text-xs font-normal opacity-80">{t("admin_backups.create_database_hint")}</span>
          {creating === "database" && <span className="text-xs">{t("admin_backups.creating")}</span>}
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleCreate("uploads")}
          disabled={!!creating}
          className="h-auto flex-col items-start gap-2 py-4 px-4"
        >
          <FolderArchive className="h-5 w-5" />
          <span className="font-semibold">{t("admin_backups.create_uploads")}</span>
          <span className="text-xs font-normal opacity-80">{t("admin_backups.create_uploads_hint")}</span>
          {creating === "uploads" && <span className="text-xs">{t("admin_backups.creating")}</span>}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleCreate("full")}
          disabled={!!creating}
          className="h-auto flex-col items-start gap-2 border-primary/30 py-4 px-4"
        >
          <HardDrive className="h-5 w-5" />
          <span className="font-semibold">{t("admin_backups.create_full")}</span>
          <span className="text-xs font-normal opacity-80">{t("admin_backups.create_full_hint")}</span>
          {creating === "full" && <span className="text-xs">{t("admin_backups.creating")}</span>}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("admin_backups.col_file")}</th>
                <th className="px-4 py-3">{t("admin_backups.col_type")}</th>
                <th className="px-4 py-3">{t("admin_backups.col_size")}</th>
                <th className="px-4 py-3">{t("admin_backups.col_date")}</th>
                <th className="px-4 py-3 text-right">{t("admin_backups.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {t("admin_backups.loading")}
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {t("admin_backups.empty")}
                  </td>
                </tr>
              ) : (
                backups.map((backup) => (
                  <tr key={backup.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{backup.filename}</td>
                    <td className="px-4 py-3">
                      <Badge variant={typeVariant(backup.type)}>{t(`admin_backups.type_${backup.type}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">{formatBytes(backup.size)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(backup.createdAt), "dd MMM yyyy, HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(backup)}
                          disabled={downloading === backup.id}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          {t("admin_backups.download")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(backup)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("admin_backups.note")}</p>
    </div>
  );
}

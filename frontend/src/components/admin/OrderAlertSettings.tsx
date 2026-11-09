import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminSettingsRepository } from "@/client/apiClient";

const MAX_RECIPIENTS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Settings → Order alerts: who gets a "new order" e-mail for every confirmed order */
export function OrderAlertSettings() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);

  useEffect(() => {
    adminSettingsRepository
      .getOrderAlertSettings()
      .then((res) => {
        if (res.success && res.data) {
          setEnabled(!!res.data.enabled);
          setEmails(res.data.recipients?.length ? res.data.recipients : [""]);
        }
      })
      .catch((err) => console.error("Error fetching order alert settings:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filled = emails.map((e) => e.trim()).filter(Boolean);
  const invalid = filled.filter((e) => !EMAIL_RE.test(e));

  const validate = (): string[] | null => {
    if (invalid.length) {
      toast.error(t("admin_settings.order_alerts.toast_invalid", { emails: invalid.join(", ") }));
      return null;
    }
    return filled;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = validate();
    if (!recipients) return;
    if (enabled && recipients.length === 0) {
      toast.error(t("admin_settings.order_alerts.toast_need_email"));
      return;
    }
    try {
      setIsSaving(true);
      const res = await adminSettingsRepository.updateOrderAlertSettings({ enabled, recipients });
      if (res.success) {
        setEmails(res.data.recipients.length ? res.data.recipients : [""]);
        toast.success(t("admin_settings.order_alerts.toast_saved"));
      }
    } catch (err: any) {
      toast.error(err?.message || t("admin_settings.order_alerts.toast_save_error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    const recipients = validate();
    if (!recipients) return;
    if (recipients.length === 0) {
      toast.error(t("admin_settings.order_alerts.toast_need_email"));
      return;
    }
    try {
      setIsTesting(true);
      const res = await adminSettingsRepository.testOrderAlertSettings(recipients);
      toast.success(
        res.usedOrder
          ? t("admin_settings.order_alerts.toast_test_sent_order", { emails: res.sent.join(", "), order: res.usedOrder })
          : t("admin_settings.order_alerts.toast_test_sent", { emails: res.sent.join(", ") })
      );
    } catch (err: any) {
      toast.error(err?.message || t("admin_settings.order_alerts.toast_test_error"));
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-4 w-full max-w-xl space-y-5 rounded-xl border bg-card p-4 sm:p-6">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 font-semibold">
          <Mail className="h-4 w-4 text-primary" />
          {t("admin_settings.order_alerts.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("admin_settings.order_alerts.description")}</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="order-alerts-enabled" checked={enabled} onCheckedChange={setEnabled} />
        <Label htmlFor="order-alerts-enabled">{t("admin_settings.order_alerts.enable")}</Label>
      </div>

      <div className="space-y-2">
        <Label>{t("admin_settings.order_alerts.recipients")}</Label>
        {emails.map((email, i) => {
          const isInvalid = email.trim() !== "" && !EMAIL_RE.test(email.trim());
          return (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                placeholder={t("admin_settings.order_alerts.placeholder", { n: i + 1 })}
                onChange={(e) => setEmails((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                aria-invalid={isInvalid}
                className={isInvalid ? "border-destructive focus-visible:ring-destructive/40" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setEmails((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [""]))}
                title={t("admin_settings.order_alerts.remove")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {emails.length < MAX_RECIPIENTS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full gap-1"
            onClick={() => setEmails((prev) => [...prev, ""])}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("admin_settings.order_alerts.add")}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">{t("admin_settings.order_alerts.hint", { max: MAX_RECIPIENTS })}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("admin_settings.order_alerts.template_hint")}{" "}
        <Link to="/admin/cms/email-templates" className="text-primary underline underline-offset-2">
          {t("admin_settings.order_alerts.template_link")}
        </Link>
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" className="rounded-full w-full sm:w-auto" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_settings.order_alerts.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full w-full sm:w-auto gap-1.5"
          onClick={handleTest}
          disabled={isTesting}
        >
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("admin_settings.order_alerts.test")}
        </Button>
      </div>
    </form>
  );
}

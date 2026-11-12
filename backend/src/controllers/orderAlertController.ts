import { Request, Response, NextFunction } from "express";
import {
  MAX_ORDER_ALERT_RECIPIENTS,
  getOrderAlertSettings,
  normalizeRecipients,
  saveOrderAlertSettings,
  sendTestOrderAlert,
} from "../services/orderAlertService";

export const getOrderAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: await getOrderAlertSettings() });
  } catch (error) {
    next(error);
  }
};

export const updateOrderAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { valid, invalid } = normalizeRecipients(req.body?.recipients);
    if (invalid.length) {
      res.status(400).json({ success: false, code: "invalid_email", invalid, message: `Invalid email address: ${invalid.join(", ")}` });
      return;
    }
    if (valid.length > MAX_ORDER_ALERT_RECIPIENTS) {
      res.status(400).json({ success: false, code: "too_many", message: `At most ${MAX_ORDER_ALERT_RECIPIENTS} email addresses` });
      return;
    }
    const enabled = req.body?.enabled === true;
    if (enabled && valid.length === 0) {
      res.status(400).json({ success: false, code: "no_recipients", message: "Add at least one email address to enable order alerts" });
      return;
    }
    res.json({ success: true, data: await saveOrderAlertSettings({ enabled, recipients: valid }) });
  } catch (error) {
    next(error);
  }
};

export const testOrderAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Recipients from the form (may be unsaved) or else the saved ones
    const fromBody = normalizeRecipients(req.body?.recipients);
    if (fromBody.invalid.length) {
      res.status(400).json({ success: false, code: "invalid_email", invalid: fromBody.invalid, message: `Invalid email address: ${fromBody.invalid.join(", ")}` });
      return;
    }
    const recipients = fromBody.valid.length ? fromBody.valid : (await getOrderAlertSettings()).recipients;
    if (recipients.length === 0) {
      res.status(400).json({ success: false, code: "no_recipients", message: "Add at least one email address" });
      return;
    }
    const result = await sendTestOrderAlert(recipients.slice(0, MAX_ORDER_ALERT_RECIPIENTS));
    const ok = result.sent.length > 0 && result.failed.length === 0;
    res.status(ok ? 200 : 502).json({
      success: ok,
      ...result,
      message: ok
        ? `Test alert sent to ${result.sent.join(", ")}`
        : `Could not send to ${result.failed.join(", ")}${result.errors[0] ? `: ${result.errors[0]}` : " (check the SMTP settings)"}`,
    });
  } catch (error) {
    next(error);
  }
};

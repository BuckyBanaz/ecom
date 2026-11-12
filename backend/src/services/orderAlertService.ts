/**
 * "New order" e-mail alerts for the shop team: every confirmed (paid) order is mailed to the addresses
 * configured in Admin → Settings → Order alerts, using the editable `admin_new_order` template.
 */
import { prisma } from "../config/db";
import { emailService } from "./emailService";

export const ORDER_ALERT_TEMPLATE = "admin_new_order";
const SETTINGS_KEY = "order_alert_settings";
export const MAX_ORDER_ALERT_RECIPIENTS = 10;

export interface OrderAlertSettings {
  enabled: boolean;
  recipients: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRecipients(input: unknown): { valid: string[]; invalid: string[] } {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[,;\s]+/) : [];
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of list) {
    const email = String(raw ?? "").trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) invalid.push(email);
    else if (!valid.includes(email)) valid.push(email);
  }
  return { valid, invalid };
}

export async function getOrderAlertSettings(): Promise<OrderAlertSettings> {
  const row = await prisma.cmsConfig.findUnique({ where: { key: SETTINGS_KEY } });
  const value = (row?.value || {}) as Partial<OrderAlertSettings>;
  return {
    enabled: value.enabled === true,
    recipients: normalizeRecipients(value.recipients).valid,
  };
}

export async function saveOrderAlertSettings(settings: OrderAlertSettings): Promise<OrderAlertSettings> {
  const value = { enabled: settings.enabled, recipients: settings.recipients };
  await prisma.cmsConfig.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value },
    update: { value },
  });
  return value;
}

const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n: unknown) => (Number(n) || 0).toFixed(2);

type AlertOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  createdAt: Date;
  items: Array<{ productName: string; quantity: number; price: number; variant?: string | null }>;
  user?: { phone?: string | null } | null;
};

function parseAddress(raw: string): Record<string, any> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { street: raw };
  } catch {
    return { street: raw };
  }
}

/** Template variables; every value is HTML-escaped except the prebuilt tables/blocks */
export function buildOrderAlertVariables(order: AlertOrder): Record<string, string> {
  const addr = parseAddress(order.shippingAddress);
  const meta = (addr._meta || {}) as { tax?: number; discount?: number };
  const phone = addr.phone || order.user?.phone || "";
  const storeUrl = (process.env.STORE_URL || process.env.CLIENT_URL || "http://localhost:8080").replace(/\/+$/, "");

  const addressLines = [
    [addr.firstName, addr.lastName].filter(Boolean).join(" ") || order.customerName,
    [addr.street, addr.houseNumber].filter(Boolean).join(" "),
    addr.landmark,
    [addr.pincode, addr.city].filter(Boolean).join(" "),
    [addr.state, addr.country].filter(Boolean).join(", "),
  ].filter((l) => l && String(l).trim());

  const cell = "padding:8px;border-bottom:1px solid #eee;";
  const orderItems = order.items
    .map(
      (it) => `<tr>
  <td style="${cell}">${escapeHtml(it.productName)}${it.variant ? `<br/><span style="color:#888;font-size:13px;">${escapeHtml(it.variant)}</span>` : ""}</td>
  <td style="${cell}text-align:center;">${it.quantity}</td>
  <td style="${cell}text-align:right;">&euro;${money(it.price * it.quantity)}</td>
</tr>`
    )
    .join("\n");

  const date = new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  }).format(order.createdAt);

  return {
    order_id: escapeHtml(order.orderNumber),
    order_date: escapeHtml(date),
    customer_name: escapeHtml(order.customerName || [addr.firstName, addr.lastName].filter(Boolean).join(" ")),
    customer_email: escapeHtml(order.customerEmail),
    customer_phone: escapeHtml(phone || "-"),
    shipping_address: addressLines.map(escapeHtml).join("<br/>"),
    order_items: orderItems,
    item_count: String(order.items.reduce((sum, it) => sum + it.quantity, 0)),
    subtotal: money(order.subtotal),
    shipping: order.shipping === 0 ? "0.00" : money(order.shipping),
    discount: money(meta.discount),
    total: money(order.total),
    payment_method: escapeHtml(String(order.paymentMethod || "-").toUpperCase()),
    payment_status: escapeHtml(String(order.paymentStatus || "-").toUpperCase()),
    admin_order_url: `${storeUrl}/admin/orders/${encodeURIComponent(order.id)}`,
  };
}

// The webhook and the checkout verification can both confirm the same order; alert once per process
const alerted = new Set<string>();

async function sendToRecipients(recipients: string[], variables: Record<string, string>, replyTo?: string) {
  const results = await Promise.allSettled(
    recipients.map((to) => emailService.sendTemplateEmail(to, ORDER_ALERT_TEMPLATE, variables, { replyTo }))
  );
  const sent = recipients.filter((_, i) => results[i].status === "fulfilled" && (results[i] as PromiseFulfilledResult<boolean>).value);
  const failed = recipients.filter((r) => !sent.includes(r));
  return { sent, failed, errors: results.flatMap((r) => (r.status === "rejected" ? [String(r.reason?.message || r.reason)] : [])) };
}

/** Called when an order is confirmed (paid). Never throws. */
export async function sendNewOrderAlert(order: AlertOrder): Promise<void> {
  try {
    if (alerted.has(order.id)) return;
    const settings = await getOrderAlertSettings();
    if (!settings.enabled || settings.recipients.length === 0) return;
    alerted.add(order.id);
    if (alerted.size > 5000) alerted.delete(alerted.values().next().value as string);

    const { sent, failed, errors } = await sendToRecipients(
      settings.recipients,
      buildOrderAlertVariables(order),
      order.customerEmail
    );
    console.log(`[OrderAlert] Order ${order.orderNumber}: sent to ${sent.length}, failed ${failed.length}${errors.length ? ` (${errors[0]})` : ""}`);
  } catch (err: any) {
    console.error("[OrderAlert] Failed:", err?.message || err);
  }
}

/** Test mail with the latest order (or sample data) to the given or saved recipients */
export async function sendTestOrderAlert(recipients: string[]) {
  const latest = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: { select: { phone: true } } },
  });
  const order: AlertOrder = latest ?? {
    id: "test",
    orderNumber: "TEST-0001",
    customerName: "Jan Jansen",
    customerEmail: "jan@example.com",
    subtotal: 129.95,
    shipping: 0,
    total: 129.95,
    paymentMethod: "ideal",
    paymentStatus: "paid",
    shippingAddress: JSON.stringify({
      firstName: "Jan", lastName: "Jansen", phone: "+31 6 12345678",
      street: "Voorbeeldstraat", houseNumber: "1", pincode: "1234 AB", city: "Amsterdam", country: "Netherlands",
    }),
    createdAt: new Date(),
    items: [{ productName: "Voorbeeld Hanglamp", quantity: 1, price: 129.95, variant: null }],
  };
  return { usedOrder: latest ? latest.orderNumber : null, ...(await sendToRecipients(recipients, buildOrderAlertVariables(order))) };
}

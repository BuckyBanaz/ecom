# Sendcloud Integration Guide

This document explains how Sendcloud is integrated into the e-commerce platform, what must be configured in the Sendcloud panel, and how to troubleshoot common label-creation failures.

---

## 1. Overview

Sendcloud is used for:

- Fetching available shipping methods (PostNL, DHL, etc.)
- Creating and announcing shipments (generating labels)
- Downloading label PDFs
- Receiving tracking status updates via webhooks

The application code and API connection can work correctly while **real carrier labels still fail** if the Sendcloud account is not fully set up (billing, carrier contracts, sender address).

| Component | Typical status when billing is incomplete |
|-----------|-------------------------------------------|
| Website / app code | Working |
| Sendcloud API keys | Working |
| Shipping methods list | Working (methods appear in admin) |
| Real carrier label creation (PostNL, DHL, etc.) | **Blocked by Sendcloud** |
| Unstamped letter (test only) | May work without full billing |

---

## 2. How It Works in This Project

### Admin workflow

1. Order is paid and packed → status becomes **Ready to Ship**
2. Admin opens **Ready to Ship** or **Order Details**
3. Admin selects a shipping method and clicks **Create Shipment**
4. Backend calls Sendcloud API v3 (`/shipments/announce`)
5. On success, the order is updated with:
   - `trackingNumber`
   - `trackingUrl`
   - `labelUrl`
   - `carrier`
   - `shipmentStatus`
   - Order status → `label_generated`
6. Sendcloud webhooks push further tracking updates (in transit, delivered, etc.)

### Backend files

| File | Purpose |
|------|---------|
| `backend/src/services/sendcloud/api.ts` | Sendcloud API client (v2 + v3) |
| `backend/src/services/sendcloud/webhook.ts` | Incoming webhook handler |
| `backend/src/controllers/orderController.ts` | Shipment creation endpoints |
| `backend/test_sendcloud.mjs` | Quick connectivity test script |

### API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/orders/sendcloud/methods` | List shipping methods (admin only) |
| `POST` | `/api/v1/orders/:id/sendcloud/shipment` | Create shipment / label (admin only) |
| `GET` | `/api/v1/orders/:id/sendcloud/label` | Download label PDF (admin only) |
| `POST` | `/api/v1/webhooks/sendcloud` | Sendcloud status webhooks |

---

## 3. Sendcloud Panel Setup (Required)

> [!IMPORTANT]
> Sendcloud may return shipping methods via the API even when billing is not configured. **Label announcement for real carriers is blocked until billing and carrier contracts are active.**

### Step 1: Activate billing

1. Log in to [Sendcloud Panel](https://panel.sendcloud.sc/)
2. Go to **Settings → Billing**
3. Activate **Direct debit** as the payment method
4. Complete any verification steps Sendcloud requires

Without active billing, Sendcloud returns errors such as **"not allowed to announce"** when creating real carrier labels.

### Step 2: Activate carrier contracts

1. Go to **Settings → Carriers**
2. Enable and activate the carriers you need (e.g. **PostNL**)
3. Confirm the contract status shows as **Active**

If PostNL (or another carrier) is not active, the app may list the method but fail when announcing the shipment.

### Step 3: Configure sender address

1. Go to **Settings → Addresses**
2. Add your warehouse / shop address
3. Set one address as the **default sender address**

The backend fetches this automatically via the Sendcloud API. If none is set, a fallback address is used, which can cause routing or validation errors.

### Step 4: Generate API keys

1. Go to **Settings → Integrations**
2. Create or copy your **Public Key** and **Secret Key**
3. Add them to the backend environment (see Section 4)

### Step 5: Configure webhooks (production)

1. Go to **Settings → Integrations → Webhooks**
2. Set the webhook URL to:

   ```
   https://api.yourdomain.com/api/v1/webhooks/sendcloud
   ```

3. Copy the **Webhook Secret** and set `SENDCLOUD_WEBHOOK_SECRET` in the backend `.env`

Webhooks keep order tracking status in sync (in transit, delivered, etc.) after the label is created.

---

## 4. Environment Variables

Add these to `backend/.env` (or your production secrets manager):

```env
SENDCLOUD_ENABLED="true"
SENDCLOUD_PUBLIC_KEY="your-public-key"
SENDCLOUD_SECRET_KEY="your-secret-key"
SENDCLOUD_WEBHOOK_SECRET="your-webhook-secret"
```

You can also configure keys from the admin panel:

**Admin → Settings → Shipping → Sendcloud Integration**

Changes made in the admin panel update the backend `.env` at runtime.

---

## 5. Customer Address Requirements

Sendcloud requires a valid delivery address. The order shipping address must include:

| Field | Required | Notes |
|-------|----------|-------|
| `firstName`, `lastName` | Yes | Combined into recipient name |
| `street` | Yes | Street name |
| `houseNumber` | Recommended | Required for NL addresses; shown in checkout as "(for Sendcloud)" |
| `city` | Yes | |
| `pincode` / `postalCode` | Yes | NL format: `1234AB` (spaces optional) |
| `country` | Yes | Normalized to ISO code (e.g. `NL`, `DE`, `BE`) |
| `phone` | Recommended | |
| `email` | Yes | Falls back to order customer email |

Missing or invalid address data causes Sendcloud validation errors during shipment creation.

---

## 6. Testing

### Option A: Unstamped letter (no billing required)

Use this to verify the integration end-to-end before billing is fully set up:

1. Open an order in **Ready to Ship**
2. Select **Unstamped letter** as the shipping method
3. Click **Create Shipment**

If this succeeds, the app integration is working. Real carrier labels will work once billing and carrier contracts are active.

### Option B: API connectivity test

From the `backend` folder:

```bash
node test_sendcloud.mjs
```

Expected output when keys are valid:

```
v2 shipping_methods status: 200
v2 shipping methods count: <number>
```

A `200` status confirms API keys and connectivity. It does **not** confirm that label announcement is allowed for your account.

### Option C: Full carrier test (billing required)

1. Complete Sendcloud billing setup (Section 3)
2. Activate PostNL (or your chosen carrier)
3. Create a test order with a valid NL address (including house number)
4. Select a PostNL method and create the shipment

---

## 7. Troubleshooting

### Error: "not allowed to announce"

**Cause:** Sendcloud billing is not active, or the selected carrier contract is not enabled.

**Fix:**

1. Settings → Billing → activate **Direct debit**
2. Settings → Carriers → activate **PostNL** (or the carrier you selected)
3. Retry shipment creation

The backend appends this hint automatically when it detects this error.

---

### Shipping methods load, but label creation fails

**Cause:** API keys work, but account setup is incomplete.

**Checklist:**

- [ ] Billing (direct debit) is active
- [ ] Carrier contract is active
- [ ] Default sender address is set in Sendcloud
- [ ] Order has valid address (especially `houseNumber` for NL)
- [ ] Selected method matches destination country and parcel weight

---

### "No shipping methods available" in admin

**Cause:** Invalid or missing API keys, or Sendcloud is disabled.

**Fix:**

1. Verify `SENDCLOUD_ENABLED="true"`
2. Verify `SENDCLOUD_PUBLIC_KEY` and `SENDCLOUD_SECRET_KEY` in `.env`
3. Restart the backend after changing `.env`
4. Run `node test_sendcloud.mjs` to confirm connectivity

---

### "No active Sendcloud shipping option found for method …"

**Cause:** The selected v2 method cannot be mapped to an active v3 shipping option for the route (e.g. NL → NL) or the carrier is not enabled.

**Fix:**

1. Activate the carrier in Sendcloud panel
2. Try a different shipping method
3. Confirm sender and recipient postal codes are valid

---

### Webhook updates not arriving

**Fix:**

1. Confirm webhook URL points to production: `https://api.yourdomain.com/api/v1/webhooks/sendcloud`
2. Set `SENDCLOUD_WEBHOOK_SECRET` to match the secret in Sendcloud panel
3. Ensure the endpoint is reachable over HTTPS (not localhost)
4. Check backend logs for `[Sendcloud Webhook]` entries

---

## 8. Backend Logs to Share When Debugging

If shipment creation still fails after completing Sendcloud setup, check the backend terminal for these log lines:

```
📡 Sendcloud v2 API - Fetching all shipping methods
📦 Sendcloud Parcel - Address Data:
📦 Sendcloud v3 Shipment Body:
❌ Sendcloud createParcel FAILED:
⚠️ Sendcloud shipping-options failed:
```

Copy the full error block (status code + JSON response) when reporting the issue.

---

## 9. Order Status Flow (Sendcloud-related)

| Order status | Meaning |
|--------------|---------|
| `ready_to_ship` | Packed; waiting for label creation |
| `label_generated` | Sendcloud shipment created; label available |
| `in_transit` | Updated via Sendcloud webhook |
| `delivered` | Updated via Sendcloud webhook |

See `docs/orders-api-plan.md` for the full order lifecycle.

---

## 10. Production Checklist

Before going live with Sendcloud:

- [ ] Sendcloud billing (direct debit) is active
- [ ] Required carrier contracts (e.g. PostNL) are active
- [ ] Default sender address is configured
- [ ] `SENDCLOUD_PUBLIC_KEY` and `SENDCLOUD_SECRET_KEY` are set in production
- [ ] Webhook URL is set to the live backend domain
- [ ] `SENDCLOUD_WEBHOOK_SECRET` is set in production
- [ ] Test shipment created successfully with a real carrier (not just unstamped letter)

Also see `docs/production_deployment_checklist.md` for general deployment steps.

---

## 11. References

- [Sendcloud API Documentation](https://docs.sendcloud.sc/)
- [Sendcloud Support — Parcel Statuses](https://support.sendcloud.com/hc/en-us/articles/360024967012)
- Internal: `docs/orders-api-plan.md` — order and shipment workflow

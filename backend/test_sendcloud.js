/**
 * Sendcloud Full Test Script
 * Run: node test_sendcloud.js
 *
 * Tests:
 *  1. API connectivity (shipping methods)
 *  2. Sender address fetch
 *  3. Shipping options (v3)
 */

require("dotenv").config({ path: "./.env" });

const PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY;
const SECRET_KEY = process.env.SENDCLOUD_SECRET_KEY;

if (!PUBLIC_KEY || !SECRET_KEY) {
  console.error("❌ SENDCLOUD_PUBLIC_KEY or SENDCLOUD_SECRET_KEY missing from .env");
  process.exit(1);
}

const authHeader = "Basic " + Buffer.from(`${PUBLIC_KEY}:${SECRET_KEY}`).toString("base64");
const headers = { Authorization: authHeader, "Content-Type": "application/json" };

const BASE_V2 = "https://panel.sendcloud.sc/api/v2";
const BASE_V3 = "https://panel.sendcloud.sc/api/v3";

async function test() {
  console.log("\n====================================");
  console.log("  Sendcloud Integration Test");
  console.log("====================================\n");

  // Test 1: Shipping Methods (v2)
  console.log("🔍 Test 1: Fetching shipping methods (v2)...");
  try {
    const res = await fetch(`${BASE_V2}/shipping_methods`, { headers });
    const data = await res.json();
    if (res.ok) {
      const count = data.shipping_methods?.length || 0;
      console.log(`✅ Status: ${res.status} — ${count} shipping methods available`);
      if (count > 0) {
        console.log("   Methods:");
        data.shipping_methods.slice(0, 5).forEach(m =>
          console.log(`   - [${m.id}] ${m.name} (${m.carrier})`)
        );
        if (count > 5) console.log(`   ... and ${count - 5} more`);
      }
    } else {
      console.error(`❌ Status: ${res.status}`, data);
    }
  } catch (e) {
    console.error("❌ FAILED:", e.message);
  }

  console.log("");

  // Test 2: Sender Addresses (v2)
  console.log("🔍 Test 2: Fetching sender addresses...");
  try {
    const res = await fetch(`${BASE_V2}/user/addresses/sender`, { headers });
    const data = await res.json();
    if (res.ok) {
      const addresses = data.sender_addresses || [];
      console.log(`✅ Status: ${res.status} — ${addresses.length} sender address(es)`);
      addresses.forEach(a =>
        console.log(`   - ${a.contact_name || a.company_name}: ${a.street} ${a.house_number}, ${a.postal_code} ${a.city} (default: ${a.is_default})`)
      );
      if (addresses.length === 0) {
        console.warn("   ⚠️  No sender address set. Add one in Sendcloud → Settings → Addresses");
      }
    } else {
      console.error(`❌ Status: ${res.status}`, data);
    }
  } catch (e) {
    console.error("❌ FAILED:", e.message);
  }

  console.log("");

  // Test 3: User account info
  console.log("🔍 Test 3: Checking account info...");
  try {
    const res = await fetch(`${BASE_V2}/user`, { headers });
    const data = await res.json();
    if (res.ok) {
      const user = data.user || data;
      console.log(`✅ Status: ${res.status} — Account: ${user.company_name || user.username || "N/A"}`);
      console.log(`   Email: ${user.email || "N/A"}`);
    } else {
      console.error(`❌ Status: ${res.status}`, data);
    }
  } catch (e) {
    console.error("❌ FAILED:", e.message);
  }

  console.log("");

  // Test 4: Shipping Options (v3) — tests if carrier contracts are active
  console.log("🔍 Test 4: Checking v3 shipping options (NL → NL, 1kg)...");
  try {
    const body = JSON.stringify({
      from_address: { country_code: "NL", postal_code: "1234AB", address_line_1: "Test Street", city: "Amsterdam" },
      to_address:   { country_code: "NL", postal_code: "2500GH", address_line_1: "Test Ave", city: "Den Haag" },
      parcels: [{ weight: { value: "1.000", unit: "kg" } }],
      calculate_quotes: false,
    });
    const res = await fetch(`${BASE_V3}/shipping-options`, { method: "POST", headers, body });
    const data = await res.json();
    if (res.ok) {
      const options = data.data || [];
      console.log(`✅ Status: ${res.status} — ${options.length} active shipping option(s) for NL → NL`);
      options.slice(0, 5).forEach(o =>
        console.log(`   - ${o.code}: ${o.name} (carrier: ${o.carrier?.code || "?"})`)
      );
      if (options.length === 0) {
        console.warn("   ⚠️  No shipping options returned. Check carrier contracts in Sendcloud → Settings → Carriers");
      }
    } else {
      console.error(`❌ Status: ${res.status}`, JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("❌ FAILED:", e.message);
  }

  console.log("\n====================================");
  console.log("  CHECKLIST");
  console.log("====================================");
  console.log("SENDCLOUD_ENABLED:", process.env.SENDCLOUD_ENABLED);
  console.log("SENDCLOUD_PUBLIC_KEY:", PUBLIC_KEY ? `${PUBLIC_KEY.slice(0, 8)}...` : "❌ MISSING");
  console.log("SENDCLOUD_SECRET_KEY:", SECRET_KEY ? `${SECRET_KEY.slice(0, 8)}...` : "❌ MISSING");
  console.log("SENDCLOUD_WEBHOOK_SECRET:", process.env.SENDCLOUD_WEBHOOK_SECRET ? "✅ Set" : "⚠️  EMPTY — set from Sendcloud → Settings → Integrations → Webhooks");
  console.log("====================================\n");
}

test();

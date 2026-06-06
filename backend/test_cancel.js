const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config();

const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
const secretKey = process.env.SENDCLOUD_SECRET_KEY;
const token = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

const headers = {
  Authorization: `Basic ${token}`,
  "Content-Type": "application/json",
};

async function test() {
  console.log("Keys:", publicKey ? "Loaded" : "Missing");
  
  // 1. Get recent parcels to see what is there
  try {
    const res = await fetch("https://panel.sendcloud.sc/api/v2/parcels?limit=5", { headers });
    console.log("GET /parcels status:", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("Recent parcels:");
      for (const p of data.parcels || []) {
        console.log(`- ID: ${p.id}, Order Number: ${p.order_number}, Status ID: ${p.status?.id}, Status: ${p.status?.message}`);
      }
    } else {
      console.log("Error fetching parcels:", await res.text());
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();

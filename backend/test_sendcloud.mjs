import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
const secretKey = process.env.SENDCLOUD_SECRET_KEY;
const token = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

const headers = {
  Authorization: `Basic ${token}`,
  "Content-Type": "application/json",
};

async function test() {
  console.log("Keys:", publicKey, secretKey);
  
  // Test v2 shipping methods
  try {
    const res = await fetch("https://panel.sendcloud.sc/api/v2/shipping_methods", { headers });
    console.log("v2 shipping_methods status:", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("v2 shipping methods count:", data.shipping_methods?.length);
      console.log("First few methods:", data.shipping_methods?.slice(0, 3));
    } else {
      console.log("v2 shipping methods error:", await res.text());
    }
  } catch (e) {
    console.error("v2 shipping methods failed:", e);
  }
}

test();

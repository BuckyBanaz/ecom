import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

let adminApp: admin.app.App | undefined;

try {
  const serviceAccountPath = path.resolve(__dirname, "../../serviceAccountKey.json");
  let serviceAccount: any = null;

  // Check if credentials exist in Environment Variables (Best for Servers)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable.");
    }
  } 
  // Fallback to local file
  else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  }

  if (serviceAccount) {
    // Only initialize if not already initialized
    if (!admin.apps.length) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin SDK initialized successfully");
    } else {
      adminApp = admin.app();
    }
  } else {
    console.warn("⚠️ Firebase Admin SDK skipped: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT is not set");
  }
} catch (error: any) {
  console.error("❌ Firebase Admin SDK initialization failed:", error.message);
}

export const messaging = adminApp ? admin.messaging() : null;

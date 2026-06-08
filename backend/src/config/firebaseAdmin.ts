import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

let adminApp: admin.app.App | undefined;

try {
  const serviceAccountPath = path.resolve(__dirname, "../../serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    
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
    console.warn("⚠️ Firebase Admin SDK skipped: serviceAccountKey.json not found");
  }
} catch (error: any) {
  console.error("❌ Firebase Admin SDK initialization failed:", error.message);
}

export const messaging = adminApp ? admin.messaging() : null;

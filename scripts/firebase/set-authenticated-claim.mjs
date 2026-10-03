/**
 * NIRMALTAG FIREBASE ADMIN UTILITY
 * Sets `role: "authenticated"` custom claim on Firebase users for Supabase Third-Party Auth Integration.
 * 
 * Usage:
 *   node scripts/firebase/set-authenticated-claim.mjs <FIREBASE_UID>
 * 
 * Setup Requirement:
 *   Place service-account-key.json in scripts/firebase/ (DO NOT COMMIT TO GIT).
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccountPath = path.resolve("./scripts/firebase/service-account-key.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Error: Service account file missing at ./scripts/firebase/service-account-key.json");
  console.error("Please download service account JSON from Firebase Console -> Project Settings -> Service accounts");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2];

if (!uid) {
  console.log("Usage: node scripts/firebase/set-authenticated-claim.mjs <FIREBASE_UID>");
  process.exit(1);
}

async function setClaim() {
  try {
    await admin.auth().setCustomUserClaims(uid, { role: "authenticated" });
    console.log(`✅ Successfully set custom claim { role: "authenticated" } for user UID: ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to set custom claim:", error);
    process.exit(1);
  }
}

setClaim();

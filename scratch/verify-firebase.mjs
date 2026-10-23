import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

console.log("==================================================");
console.log("  TESTING LIVE CLOUD FIRESTORE CONNECTION");
console.log("==================================================");

try {
  const saPath = path.resolve("firebase-service-account.json");
  console.log("Reading service account from:", saPath);
  const sa = JSON.parse(fs.readFileSync(saPath, "utf-8"));

  const app = getApps().length === 0
    ? initializeApp({
        credential: cert(sa),
        projectId: sa.project_id,
      })
    : getApps()[0];

  const db = getFirestore(app);
  console.log("Firestore initialized for project:", sa.project_id);

  console.log("Listing collections from Cloud Firestore...");
  const collections = await db.listCollections();
  console.log(`✅ SUCCESS! Connected to live Cloud Firestore.`);
  console.log(`Found ${collections.length} top-level collection(s):`, collections.map(c => c.id));

  // Test reading a document from tenants or dailySummaries if exists
  console.log("Attempting read on tenants collection...");
  const tenantsSnap = await db.collection("tenants").limit(5).get();
  console.log(`✅ Read successful! Retrieved ${tenantsSnap.docs.length} tenant document(s).`);
  tenantsSnap.docs.forEach(doc => {
    console.log(`  • Tenant ID: ${doc.id}`);
  });

  console.log("\n==================================================");
  console.log("  RESULT: CLOUD FIRESTORE IS 100% CONNECTED & WORKING!");
  console.log("==================================================");
} catch (err) {
  console.error("❌ FAILED to connect to Cloud Firestore:", err);
  process.exit(1);
}

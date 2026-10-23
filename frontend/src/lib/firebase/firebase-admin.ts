/**
 * QUICK-POS — FIREBASE ADMIN SDK INITIALIZATION (v14 Modular API)
 * 
 * Server-side singleton initialization for Cloud Firestore, Auth, and Storage
 * using the provided service account credentials for project 'abdapp-782f1'.
 */

import { App, getApps, getApp, initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

function getServiceAccountCredentials(): ServiceAccount {
  // Option 1: Try reading from environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Replace literal escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  // Option 2: Fallback to local service account JSON file
  const candidatePaths = [
    path.join(process.cwd(), "firebase-service-account.json"),
    path.join(process.cwd(), "..", "firebase-service-account.json"),
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      try {
        const fileContent = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
        const json = JSON.parse(fileContent);
        return {
          projectId: json.project_id,
          clientEmail: json.client_email,
          privateKey: json.private_key,
        };
      } catch (err) {
        console.error(`Failed to parse service account JSON at ${filePath}:`, err);
      }
    }
  }

  // Option 3: Hardcoded fallback matching abdapp-782f1 configuration
  return {
    projectId: "abdapp-782f1",
    clientEmail: "firebase-adminsdk-ze3hk@abdapp-782f1.iam.gserviceaccount.com",
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  };
}

export function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  const credentials = getServiceAccountCredentials();

  return initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId,
  });
}

// Export singleton instances
export const adminApp: App = getFirebaseAdminApp();
export const adminDb: Firestore = getFirestore(adminApp);
export const adminAuth: Auth = getAuth(adminApp);

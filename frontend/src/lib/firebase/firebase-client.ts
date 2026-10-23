/**
 * QUICK-POS — FIREBASE CLIENT SDK INITIALIZATION
 * 
 * Browser/Mobile client initialization for project 'abdapp-782f1'.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "abdapp-782f1",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "abdapp-782f1.firebaseapp.com",
};

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export const clientApp = getFirebaseClientApp();
export const clientDb: Firestore = getFirestore(clientApp);
export const clientAuth: Auth = getAuth(clientApp);

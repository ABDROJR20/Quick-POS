import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";

export async function GET() {
  try {
    // Attempt reading from Firestore to verify credentials
    const collections = await adminDb.listCollections();
    const collectionIds = collections.map((col: { id: string }) => col.id);

    return NextResponse.json({
      success: true,
      status: "connected",
      message: "Firebase Admin SDK successfully authenticated with Cloud Firestore!",
      projectId: "abdapp-782f1",
      clientEmail: "firebase-adminsdk-ze3hk@abdapp-782f1.iam.gserviceaccount.com",
      existingCollectionsCount: collectionIds.length,
      existingCollections: collectionIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Firestore test connection error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: "Failed to connect to Cloud Firestore",
        error: error?.message || String(error),
        projectId: "abdapp-782f1",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

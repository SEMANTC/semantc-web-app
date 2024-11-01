// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
    }),
  });
}

const adminAuth = admin.auth();
const firestoreAdmin = admin.firestore();

export { adminAuth, firestoreAdmin };
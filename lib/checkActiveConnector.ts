// lib/checkActiveConnector.ts
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';

export async function checkActiveConnector(token?: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const connectorDoc = await firestoreAdmin
      .collection('connectors')
      .doc(userId)
      .get();

    if (connectorDoc.exists) {
      const data = connectorDoc.data();
      return data?.active === true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying token or fetching connector:', error);
    return false;
  }
}
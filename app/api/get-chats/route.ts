// app/api/get-chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ chats: [] }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(sessionCookie);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ chats: [] }, { status: 401 });
    }

    // Get chats from Firestore
    const chatsSnapshot = await firestoreAdmin
      .collection('conversations')
      .where('userId', '==', decodedToken.uid)
      .orderBy('lastUpdated', 'desc')
      .get();

    const chats = [];
    
    for (const doc of chatsSnapshot.docs) {
      // Get messages for each conversation
      const messagesSnapshot = await firestoreAdmin
        .collection('messages')
        .where('conversationId', '==', doc.id)
        .orderBy('timestamp', 'asc')
        .get();

      const messages = messagesSnapshot.docs.map(messageDoc => ({
        id: messageDoc.id,
        ...messageDoc.data()
      }));

      chats.push({
        id: doc.id,
        ...doc.data(),
        messages
      });
    }

    return NextResponse.json({ chats });

  } catch (error) {
    console.error('Error in get-chats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Ensure OPTIONS requests are handled for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
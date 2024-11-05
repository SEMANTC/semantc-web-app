// app/api/get-chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';

// make sure to use named exports (get, not get)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

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

    // if chatid is provided, get specific chat
    if (chatId) {
      const chatDoc = await firestoreAdmin.collection('conversations').doc(chatId).get();
      
      if (!chatDoc.exists || chatDoc.data()?.userId !== decodedToken.uid) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      const messagesSnapshot = await firestoreAdmin
        .collection('messages')
        .where('conversationId', '==', chatId)
        .orderBy('timestamp', 'asc')
        .get();

      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return NextResponse.json({
        id: chatDoc.id,
        ...chatDoc.data(),
        messages
      });
    }

    // get all chats
    const chatsSnapshot = await firestoreAdmin
      .collection('conversations')
      .where('userId', '==', decodedToken.uid)
      .orderBy('lastUpdated', 'desc')
      .get();

    const chats = [];
    
    for (const doc of chatsSnapshot.docs) {
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
    console.error('error in get-chats:', error);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

// options handler
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
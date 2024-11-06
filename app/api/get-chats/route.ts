// app/api/get-chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';

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

    const userId = decodedToken.uid;

    // if chatid is provided, get specific chat
    if (chatId) {
      try {
        const chatDoc = await firestoreAdmin
          .collection('users')
          .doc(userId)
          .collection('conversations')
          .doc(chatId)
          .get();
        
        if (!chatDoc.exists) {
          return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        const messagesSnapshot = await firestoreAdmin
          .collection('users')
          .doc(userId)
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
      } catch (error: any) {
        console.error('Error fetching specific chat:', error);
        if (error.code === 9) {
          return NextResponse.json({ 
            error: 'Database indexes are being created. Please try again in a few minutes.',
            details: error.details 
          }, { status: 503 });
        }
        throw error;
      }
    }

    // get all chats
    try {
      const chatsSnapshot = await firestoreAdmin
        .collection('users')
        .doc(userId)
        .collection('conversations')
        .orderBy('lastUpdated', 'desc')
        .get();

      const chats = [];
      
      for (const doc of chatsSnapshot.docs) {
        try {
          const messagesSnapshot = await firestoreAdmin
            .collection('users')
            .doc(userId)
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
        } catch (messageError) {
          console.error(`Error fetching messages for chat ${doc.id}:`, messageError);
          chats.push({
            id: doc.id,
            ...doc.data(),
            messages: []
          });
        }
      }

      return NextResponse.json({ chats });
    } catch (error: any) {
      if (error.code === 9) {
        return NextResponse.json({ 
          error: 'Database indexes are being created. Please try again in a few minutes.',
          details: error.details 
        }, { status: 503 });
      }
      throw error;
    }

  } catch (error) {
    console.error('error in get-chats:', error);
    return NextResponse.json({ error: 'internal server error' }, { status: 500 });
  }
}

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
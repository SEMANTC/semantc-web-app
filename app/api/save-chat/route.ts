// app/api/save-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('POST /api/save-chat called');
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('session')?.value;
    console.log('Session cookie present:', !!sessionCookie);
    
    if (!sessionCookie) {
      console.log('No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken; 
    try {
      decodedToken = await adminAuth.verifyIdToken(sessionCookie);
      console.log('Token verified for user:', decodedToken.uid);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get chat data from request
    const chat = await request.json();
    console.log('Received chat data:', { 
      id: chat.id, 
      messageCount: chat.messages?.length 
    });

    if (!chat) {
      console.log('No chat data provided');
      return NextResponse.json({ error: 'No chat data provided' }, { status: 400 });
    }

    // Prepare chat document
    const chatData = {
      id: chat.id,
      userId: userId,
      title: chat.title || 'New Chat',
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      messageCount: chat.messages?.length || 0,
      path: chat.path || `/chat/${chat.id}`,
    };

    console.log('Preparing to save chat:', chatData);

    // Start a batch write
    const batch = firestoreAdmin.batch();

    // Save chat metadata - Now under user's subcollection
    const chatRef = firestoreAdmin
      .collection('users')
      .doc(userId)
      .collection('conversations')
      .doc(chat.id);

    batch.set(chatRef, chatData, { merge: true });

    // Save messages
    if (chat.messages && chat.messages.length > 0) {
      console.log(`Processing ${chat.messages.length} messages`);
      for (const message of chat.messages) {
        if (!message.id) {
          console.log('Skipping message without ID');
          continue;
        }

        const messageRef = firestoreAdmin
          .collection('users')
          .doc(userId)
          .collection('messages')
          .doc(message.id);

        batch.set(messageRef, {
          conversationId: chat.id,
          content: message.content,
          role: message.role,
          timestamp: FieldValue.serverTimestamp(),
          metadata: message.metadata || {}
        });
      }
    }

    // Commit the batch
    console.log('Committing batch write...');
    await batch.commit();
    console.log('Batch write successful');

    return NextResponse.json({ success: true, chatId: chat.id });

  } catch (error) {
    console.error('Error in save-chat:', error);
    return NextResponse.json(
      { error: 'Failed to save chat' }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
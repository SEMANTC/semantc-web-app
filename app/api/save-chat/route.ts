// app/api/save-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(sessionCookie);
    const userId = decodedToken.uid;

    // Get chat data from request
    const chat = await request.json();

    if (!chat) {
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

    // Start a batch write
    const batch = firestoreAdmin.batch();

    // Save chat metadata
    const chatRef = firestoreAdmin.collection('conversations').doc(chat.id);
    batch.set(chatRef, chatData, { merge: true });

    // Save messages
    if (chat.messages && chat.messages.length > 0) {
      for (const message of chat.messages) {
        if (!message.id) continue; // Skip messages without IDs

        const messageRef = firestoreAdmin.collection('messages').doc(message.id);
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
    await batch.commit();

    return NextResponse.json({ success: true, chatId: chat.id });

  } catch (error) {
    console.error('Error saving chat:', error);
    return NextResponse.json(
      { error: 'Failed to save chat' }, 
      { status: 500 }
    );
  }
}
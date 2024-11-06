// lib/services/conversations.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch, 
  serverTimestamp,
  increment,
  QueryConstraint,
  Firestore
} from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Chat, ExtendedMessage } from '../types';

export class ConversationsService {
  // Collection references
  private conversationsRef = collection(firestore, 'conversations');
  private messagesRef = collection(firestore, 'messages');
  private vectorsRef = collection(firestore, 'message_vectors');

  async createConversation(userId: string, initialMessage: string): Promise<string> {
    // Create conversation metadata
    const conversationRef = await addDoc(this.conversationsRef, {
      userId,
      title: initialMessage.slice(0, 100), // First message as title
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      messageCount: 0,
      summary: null
    });

    return conversationRef.id;
  }

  async saveMessage(
    conversationId: string, 
    message: ExtendedMessage
  ): Promise<string> {
    // Add message to messages collection
    const messageRef = await addDoc(this.messagesRef, {
      conversationId,
      content: message.content,
      role: message.role,
      timestamp: serverTimestamp(),
      metadata: message.metadata || {}
    });

    // Update conversation metadata
    await updateDoc(doc(this.conversationsRef, conversationId), {
      lastUpdated: serverTimestamp(),
      messageCount: increment(1)
    });

    return messageRef.id;
  }

  async getConversation(conversationId: string, userId: string): Promise<Chat | null> {
    // Get conversation metadata
    const conversationDoc = await getDoc(doc(this.conversationsRef, conversationId));
    
    if (!conversationDoc.exists() || 
        conversationDoc.data().userId !== userId) {
      return null;
    }

    // Get all messages
    const messagesSnapshot = await getDocs(
      query(
        this.messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      )
    );

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExtendedMessage[];

    return {
      id: conversationId,
      userId,
      ...conversationDoc.data(),
      messages
    } as Chat;
  }

  async getUserConversations(userId: string): Promise<Chat[]> {
    const conversationsSnapshot = await getDocs(
      query(
        this.conversationsRef,
        where('userId', '==', userId),
        orderBy('lastUpdated', 'desc')
      )
    );

    return Promise.all(
      conversationsSnapshot.docs.map(async doc => {
        const messages = await this.getConversationMessages(doc.id);
        return {
          id: doc.id,
          ...doc.data(),
          messages
        } as Chat;
      })
    );
  }

  private async getConversationMessages(conversationId: string): Promise<ExtendedMessage[]> {
    const messagesSnapshot = await getDocs(
      query(
        this.messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      )
    );

    return messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExtendedMessage[];
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversationDoc = await getDoc(doc(this.conversationsRef, conversationId));
    
    if (!conversationDoc.exists() || 
        conversationDoc.data().userId !== userId) {
      throw new Error('Unauthorized');
    }

    const batch = writeBatch(firestore);

    // Delete messages
    const messagesSnapshot = await getDocs(
      query(this.messagesRef, where('conversationId', '==', conversationId))
    );
    messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete conversation
    batch.delete(doc(this.conversationsRef, conversationId));

    await batch.commit();
  }
}

// Export singleton instance
export const conversationsService = new ConversationsService();
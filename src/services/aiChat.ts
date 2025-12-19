import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Service for AI Chat functionality
 */

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  reply: string;
}

/**
 * Send a message to the AI assistant
 */
export async function sendChatMessage(message: string): Promise<string> {
  try {
    const chatWithAI = httpsCallable<ChatRequest, ChatResponse>(functions, 'chatWithAI');
    const result = await chatWithAI({ message });
    return result.data.reply;
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    throw new Error(error.message || 'Failed to send message. Please try again.');
  }
}


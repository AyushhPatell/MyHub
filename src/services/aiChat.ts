import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Service for AI Chat functionality
 */

interface ChatRequest {
  message: string;
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface ChatResponse {
  reply: string;
}

/**
 * Send a message to the AI assistant with optional chat history
 */
export async function sendChatMessage(
  message: string,
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    const chatWithAI = httpsCallable<ChatRequest, ChatResponse>(functions, 'chatWithAI');
    const result = await chatWithAI({ 
      message,
      chatHistory: chatHistory || []
    });
    return result.data.reply;
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    throw new Error(error.message || 'Failed to send message. Please try again.');
  }
}


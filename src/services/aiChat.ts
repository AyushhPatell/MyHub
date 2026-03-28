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
 * Map Firebase callable / network errors to a user-safe string.
 * Raw "internal" is common when the server fails; never show it alone.
 */
function getCallableErrorMessage(error: unknown): string {
  const fallback =
    'The assistant could not respond right now. Please try again in a moment.';

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const e = error as { code?: string; message?: string; details?: unknown };
  const code = String(e.code || '');
  const raw = String(e.message || '').trim();

  if (
    code === 'functions/internal' ||
    /^internal$/i.test(raw) ||
    raw.toLowerCase() === 'internal error.'
  ) {
    return fallback;
  }

  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
    return 'The service is busy. Please try again in a moment.';
  }

  if (code === 'functions/resource-exhausted') {
    return raw.length > 0 && !/^internal$/i.test(raw)
      ? raw
      : "I've reached the usage limit for now. Please try again later.";
  }

  if (code === 'functions/unauthenticated') {
    return 'Please sign in again and try once more.';
  }

  if (raw.length > 0 && !/^internal$/i.test(raw)) {
    return raw;
  }

  return fallback;
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
      chatHistory: chatHistory || [],
    });
    return result.data.reply;
  } catch (error: unknown) {
    console.error('Error sending chat message:', error);
    throw new Error(getCallableErrorMessage(error));
  }
}

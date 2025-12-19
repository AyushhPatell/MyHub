import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendChatMessage } from '../services/aiChat';
import { createPortal } from 'react-dom';
import { semesterService, assignmentService } from '../services/firestore';
import { getTodayRange, getWeekRange } from '../utils/dateHelpers';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatWindowProps {
  onClose: () => void;
}

/**
 * AI Chat Window Component
 * 
 * Displays the chat interface for interacting with the AI assistant.
 */
export default function AIChatWindow({ onClose }: AIChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const typingMessageIdRef = useRef<string | null>(null); // Track message being typed

  // Load proactive suggestions
  useEffect(() => {
    if (!user) return;

    const loadSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        const activeSemester = await semesterService.getActiveSemester(user.uid);
        if (!activeSemester) {
          setSuggestions([
            "Set up your first semester to get started!",
            "I can help you organize your academic schedule."
          ]);
          setLoadingSuggestions(false);
          return;
        }

        const allAssignments = await assignmentService.getAllAssignments(
          user.uid,
          activeSemester.id
        );

        const todayRange = getTodayRange();
        const weekRange = getWeekRange();

        const todayAssignments = allAssignments.filter(
          (a) => !a.completedAt &&
            new Date(a.dueDate) >= todayRange.start &&
            new Date(a.dueDate) <= todayRange.end
        );

        const weekAssignments = allAssignments.filter(
          (a) => !a.completedAt &&
            new Date(a.dueDate) >= weekRange.start &&
            new Date(a.dueDate) <= weekRange.end
        );

        const overdueAssignments = allAssignments.filter(
          (a) => !a.completedAt && new Date(a.dueDate) < todayRange.start
        );

        const newSuggestions: string[] = [];

        if (overdueAssignments.length > 0) {
          newSuggestions.push(
            `⚠️ You have ${overdueAssignments.length} overdue assignment${overdueAssignments.length > 1 ? 's' : ''}. Let's get those done!`
          );
        }

        if (todayAssignments.length > 0) {
          newSuggestions.push(
            `📅 You have ${todayAssignments.length} assignment${todayAssignments.length > 1 ? 's' : ''} due today. Need help prioritizing?`
          );
        } else if (weekAssignments.length > 0) {
          newSuggestions.push(
            `📚 You have ${weekAssignments.length} assignment${weekAssignments.length > 1 ? 's' : ''} due this week. Want to plan your schedule?`
          );
        }

        if (newSuggestions.length === 0) {
          newSuggestions.push(
            "✨ Your schedule looks clear! How can I help you today?",
            "Ask me about your schedule, assignments, or courses!"
          );
        }

        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Error loading suggestions:', error);
        setSuggestions(["How can I help you today?"]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [user]);

  // Load chat history from Firestore
  useEffect(() => {
    if (!user) return;

    const chatHistoryRef = collection(db, 'users', user.uid, 'aiChatHistory');
    const q = query(chatHistoryRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            role: data.role as 'user' | 'assistant',
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date(),
          };
        })
        .reverse(); // Reverse to show oldest first

      // Filter out messages that are currently being typed
      // This prevents duplicate display during typing animation
      const filteredMessages = loadedMessages.filter(
        (msg) => msg.id !== typingMessageIdRef.current
      );

      setMessages(filteredMessages);
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Prevent background scroll when chat is open (works on mobile/tablet too)
  useEffect(() => {
    // Store original styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    // Get current scroll position
    const scrollY = window.scrollY;
    
    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Also prevent scrolling on html element (for mobile browsers)
    const html = document.documentElement;
    const originalHtmlOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    
    // Prevent touch scrolling on iOS
    const preventTouchMove = (e: TouchEvent) => {
      // Allow touch events inside the chat window
      if (chatWindowRef.current?.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
    };
    
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
    
    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      html.style.overflow = originalHtmlOverflow;
      
      // Restore scroll position
      window.scrollTo(0, scrollY);
      
      // Remove touch event listener
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, []);

  // Handle Esc key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Typing animation for AI responses
  const typeMessage = (text: string, onComplete?: () => void) => {
    if (!text || text.length === 0) {
      setIsTyping(false);
      setTypingMessage('');
      if (onComplete) onComplete();
      return;
    }

    setIsTyping(true);
    setTypingMessage('');
    let index = 0;
    const typingInterval = setInterval(() => {
      try {
        if (index < text.length) {
          setTypingMessage(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          if (onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Error in typing animation:', error);
        clearInterval(typingInterval);
        setIsTyping(false);
        setTypingMessage(text); // Show full message on error
        if (onComplete) {
          onComplete();
        }
      }
    }, 15); // Adjust speed here (lower = faster)
  };

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, 'users', user.uid, 'aiChatHistory'), {
        role: 'user',
        content: userMessage.content,
        timestamp: Timestamp.now(),
      });

      // Prepare chat history (last 10 messages for context)
      const recentHistory = messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call AI service with chat history
      const reply = await sendChatMessage(userMessage.content, recentHistory);

      // Create a temporary ID for the message being typed
      // This prevents Firestore listener from showing it until typing completes
      const tempMessageId = `typing-${Date.now()}`;
      typingMessageIdRef.current = tempMessageId;

      // Type out the response smoothly, then save to Firestore
      // This prevents duplicate messages (one from Firestore, one from typing)
      typeMessage(reply, async () => {
        // Save to Firestore after typing completes
        try {
          await addDoc(
            collection(db, 'users', user.uid, 'aiChatHistory'),
            {
              role: 'assistant',
              content: reply,
              timestamp: Timestamp.now(),
            }
          );
          // Clear the typing message ID so Firestore listener can show it
          typingMessageIdRef.current = null;
        } catch (saveError) {
          console.error('Error saving AI message to Firestore:', saveError);
          typingMessageIdRef.current = null;
          // Continue even if save fails - message is already shown
        }
      });

      // Remove temporary user message (it's now in Firestore)
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } catch (err: any) {
      console.error('Error sending message:', err);
      
      // Provide user-friendly error messages
      let errorMsg = 'Something went wrong. Please try again.';
      if (err.message) {
        errorMsg = err.message;
      } else if (err.code === 'functions/rate-limit-exceeded') {
        errorMsg = 'Rate limit reached. Please try again in a moment.';
      } else if (err.code === 'functions/unauthenticated') {
        errorMsg = 'Please refresh the page and try again.';
      }
      
      setError(errorMsg);
      
      // Remove temporary message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={chatWindowRef}
        className="w-full max-w-2xl h-[600px] max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h2 className="text-white font-semibold">DashAI</h2>
              <p className="text-white/80 text-xs">Your personal AI assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8 px-4">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-3">
                  <span className="text-3xl">✨</span>
                </div>
              </div>
              <p className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Hey there! I'm DashAI 👋
              </p>
              <p className="text-sm mb-4">
                I'm here to help you stay on top of your schedule, assignments, and courses.
              </p>
              
              {/* Proactive Suggestions */}
              {!loadingSuggestions && suggestions.length > 0 && (
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Quick insights
                  </p>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(suggestion.replace(/[⚠️📅📚✨]/g, '').trim());
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              {loadingSuggestions && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading insights...</span>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-indigo-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && !isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-gray-500 dark:text-gray-400 text-sm">Please wait, analyzing your request...</span>
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2 max-w-[80%]">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {typingMessage}
                  <span className="animate-pulse">|</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your schedule, assignments, courses..."
              disabled={loading || !user || isTyping}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !user || isTyping}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


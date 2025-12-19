import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AIChatWindow from './AIChatWindow';

/**
 * Floating AI Chat Button Component
 * 
 * Displays a floating button in the bottom-right corner that opens the AI chat window.
 */
export default function AIChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110 active:scale-95"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <AIChatWindow onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}


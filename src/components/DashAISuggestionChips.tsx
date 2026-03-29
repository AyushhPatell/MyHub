import { Sparkles } from 'lucide-react';
import type { DashAISuggestionChip } from '../utils/dashaiSuggestionChips';

interface DashAISuggestionChipsProps {
  chips: DashAISuggestionChip[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Horizontally scrolling, pill-style suggested replies for DashAI.
 */
export default function DashAISuggestionChips({
  chips,
  onSelect,
  disabled,
}: DashAISuggestionChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="px-1 pt-1 pb-2">
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Suggested replies
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="listitem"
            disabled={disabled}
            onClick={() => onSelect(chip.prompt)}
            className="flex-shrink-0 max-w-[min(100%,280px)] rounded-full border border-indigo-200/90 dark:border-indigo-500/40
              bg-gradient-to-r from-white to-indigo-50/90 dark:from-gray-800/90 dark:to-indigo-950/50
              px-3.5 py-2 text-left text-[13px] font-medium leading-snug text-indigo-900 dark:text-indigo-100
              shadow-sm shadow-indigo-500/10 dark:shadow-black/20
              transition-all duration-200 hover:border-indigo-400 hover:shadow-md hover:scale-[1.02]
              active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
              dark:focus-visible:ring-offset-gray-800"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

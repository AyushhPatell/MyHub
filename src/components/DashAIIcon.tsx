/**
 * Custom DashAI Icon Component
 * 
 * A clean, modern chat/AI icon for DashAI
 */

export default function DashAIIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chat bubble shape */}
      <path
        d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H6L10 22L14 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* AI indicator - three dots in a pattern */}
      <circle cx="8" cy="10" r="1.5" fill="white" />
      <circle cx="12" cy="10" r="1.5" fill="white" />
      <circle cx="16" cy="10" r="1.5" fill="white" />
      
      {/* Small sparkle accent */}
      <circle cx="18" cy="6" r="1" fill="white" opacity="0.8" />
    </svg>
  );
}


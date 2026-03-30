import { Info } from 'lucide-react';

export default function DemoModeBanner() {
  return (
    <div className="sticky top-16 sm:top-20 z-30 px-3 sm:px-6 lg:px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg border-b border-white/20">
      <div className="w-full flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold">
        <Info className="w-4 h-4 flex-shrink-0" aria-hidden />
        <span>
          Try Demo mode: some features are limited. Create an account for full
          functionality and persistent personal data.
        </span>
      </div>
    </div>
  );
}

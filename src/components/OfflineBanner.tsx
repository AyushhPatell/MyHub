import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Fixed strip below the nav when the browser is offline.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed top-16 sm:top-20 left-0 right-0 z-[45] px-4 py-2.5
        bg-gradient-to-r from-amber-500 via-orange-500 to-red-500
        text-white text-sm font-semibold text-center shadow-lg
        flex items-center justify-center gap-2 border-b border-white/20"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0 opacity-95" aria-hidden />
      <span>You are offline. Changes may not sync until you reconnect.</span>
    </div>
  );
}

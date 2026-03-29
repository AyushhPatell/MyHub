import { useEffect, useState } from 'react';
import { Download, Smartphone, Share2 } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Install prompt for Chromium; short instructions for Safari iOS.
 */
export default function PwaInstallCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setIos(/iPad|iPhone|iPod/.test(ua));
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Install MyHub
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        Add MyHub to your home screen or desktop for quicker access and a more app-like
        experience.
      </p>

      {deferred && (
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
            bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold
            shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform
            text-sm sm:text-base"
        >
          <Download className="w-5 h-5" />
          Install app
        </button>
      )}

      {!deferred && ios && (
        <div
          className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30
            bg-indigo-50/80 dark:bg-indigo-950/30 px-4 py-3 text-sm text-gray-800
            dark:text-gray-200 leading-relaxed"
        >
          <p className="flex items-start gap-2 font-semibold text-indigo-900 dark:text-indigo-100">
            <Share2 className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            On iPhone or iPad: tap Share, then &quot;Add to Home Screen&quot;.
          </p>
        </div>
      )}

      {!deferred && !ios && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Look for the install icon in your browser&apos;s address bar (Chrome, Edge),
          or use the browser menu to install this site as an app.
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { LayoutGrid, Rocket, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Public entry point for account-free product preview.
 */
export default function TryDemoEntryPage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const root = document.documentElement;
    if (savedTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, []);

  const startDemo = async () => {
    setStarting(true);
    setError('');
    try {
      await signInAnonymously(auth);
      navigate('/', { replace: true });
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          'Could not start demo mode. Please refresh and try again.'
      );
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-2xl mb-4">
            <LayoutGrid className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Try MyHub Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore dashboard, courses, settings, and DashAI without creating an
            account.
          </p>
        </div>

        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-7 space-y-5">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/80 dark:bg-indigo-950/30 p-4 text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed">
            This mode uses temporary demo data. Some production features are
            intentionally limited and will show guidance to create an account for
            full access.
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void startDemo()}
            disabled={starting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold shadow-lg transition-all disabled:opacity-60"
          >
            {starting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting demo...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Try Demo Without Account
              </>
            )}
          </button>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Want to save your own data?
            <Link to="/register" className="ml-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

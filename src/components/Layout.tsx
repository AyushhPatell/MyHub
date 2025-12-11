import { ReactNode, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { Home, BookOpen, Settings, LogOut, Menu, X, LayoutGrid, ChevronDown } from 'lucide-react';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUserName = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || null);
          }
        } catch (error) {
          console.error('Error loading user name:', error);
        }
      }
    };
    loadUserName();
  }, [user]);


  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/courses', label: 'Courses', icon: BookOpen },
  ];

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const getUserDisplayName = () => {
    if (userName) return userName;
    if (!user?.email) return 'User';
    return user.email.split('@')[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm pt-safe">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Logo + Navigation */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">MyHub</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Search + Notifications + User */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              {/* Search - Now visible on all screen sizes */}
              <div className="flex items-center">
                <SearchBar />
              </div>

              {/* Notifications - Now visible on all screen sizes */}
              {user && (
                <div className="flex items-center">
                  <NotificationDropdown userId={user.uid} />
                </div>
              )}

              {/* User Profile Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all group"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg">
                    {getUserInitials()}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getUserDisplayName()}
                    </span>
                  </div>
                  <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-white/10">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName || user?.email}</p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                          <Settings size={18} />
                          Settings
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                          <LogOut size={18} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors relative z-50 touch-manipulation"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Rendered via Portal outside nav */}
      {mobileMenuOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 right-0 bottom-0 md:hidden z-[110] overflow-y-auto">
            <div className="min-h-full bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
              {/* Menu Header */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">MyHub</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={22} className="text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="px-4 py-6 space-y-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold text-base transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xl'
                          : 'bg-white/60 dark:bg-white/5 backdrop-blur-xl text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-white/20' 
                          : 'bg-indigo-100 dark:bg-indigo-900/30'
                      }`}>
                        <Icon size={20} className={isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'} />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </Link>
                  );
                })}
              </div>

            </div>
          </div>
        </>,
        document.body
      )}

      {/* Main Content - Full Width */}
      <main className="w-full">{children}</main>
    </div>
  );
}

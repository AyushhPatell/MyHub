import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { Home, BookOpen, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 transition-all ${
            sidebarCollapsed ? 'lg:p-4' : 'p-6'
          }`}>
            {!sidebarCollapsed ? (
              <>
                <Link to="/" className="flex-1">
                  <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors cursor-pointer">
                    MyHub
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Personal Dashboard</p>
                </Link>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X size={24} />
                  </button>
                </div>
              </>
            ) : (
              <div className="hidden lg:flex flex-col items-center w-full space-y-3">
                <Link to="/" className="flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/30 transition-colors cursor-pointer">
                  <LayoutGrid className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </Link>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-2 transition-all ${
            sidebarCollapsed ? 'lg:p-2' : 'p-4'
          }`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center transition-all ${
                      sidebarCollapsed 
                        ? 'lg:justify-center lg:px-0 lg:py-3 lg:w-full' 
                        : 'space-x-3 px-4 py-3'
                    } rounded-lg ${
                      isActive
                        ? sidebarCollapsed
                          ? 'lg:bg-primary-100 dark:lg:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <Icon size={sidebarCollapsed ? 22 : 20} className={sidebarCollapsed ? 'lg:mx-auto' : ''} />
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </Link>
                  {sidebarCollapsed && (
                    <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User section */}
          <div className={`border-t border-gray-200 dark:border-gray-700 transition-all ${
            sidebarCollapsed ? 'lg:p-2' : 'p-4'
          }`}>
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            )}
            <div className="relative group">
              <button
                onClick={handleSignOut}
                className={`flex items-center transition-all ${
                  sidebarCollapsed 
                    ? 'lg:justify-center lg:px-0 lg:py-3 lg:w-full' 
                    : 'space-x-2 px-4 py-2'
                } w-full text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg`}
                title={sidebarCollapsed ? 'Sign Out' : ''}
              >
                <LogOut size={sidebarCollapsed ? 22 : 18} className={sidebarCollapsed ? 'lg:mx-auto' : ''} />
                <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Sign Out</span>
              </button>
              {sidebarCollapsed && (
                <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Sign Out
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            MyHub
          </Link>
          <div className="flex items-center space-x-2">
            <SearchBar />
            {user && <NotificationDropdown userId={user.uid} />}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}


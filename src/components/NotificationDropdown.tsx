import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, CheckCheck, Trash2, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/firestore';
import { Notification } from '../types';
import { formatDate, formatTime } from '../utils/dateHelpers';
import ConfirmModal from './ConfirmModal';

const NOTIFICATION_DISPLAY_LIMIT = 5;

interface NotificationDropdownProps {
  userId: string;
  onOpen?: () => void;
  mobileMenuStyle?: boolean;
}

export default function NotificationDropdown({
  userId,
  onOpen,
  mobileMenuStyle = false,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();

  const displayedNotifications = notifications.slice(0, NOTIFICATION_DISPLAY_LIMIT);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notifs = await notificationService.getNotifications(userId);
      setNotifications(notifs);
      if (notifs.length > 15) {
        try {
          await notificationService.cleanupOldNotifications(userId);
          const cleaned = await notificationService.getNotifications(userId);
          setNotifications(cleaned);
        } catch (e) {
          console.error('Error cleaning up notifications:', e);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const dropdownWidth = 360;
      const padding = 16;
      const safeAreaTop = mobileMenuStyle && rect.top < 60 ? 50 : 0;
      let left =
        mobileMenuStyle
          ? Math.max(padding, Math.min(rect.left, viewportWidth - dropdownWidth - padding))
          : Math.max(padding, Math.min(rect.right - dropdownWidth, viewportWidth - dropdownWidth - padding));
      let top = Math.max(rect.bottom + 8, safeAreaTop + 8);
      setDropdownPosition({ top, left });
    }
  }, [isOpen, mobileMenuStyle]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(userId, notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAllAsRead(userId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteOne = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(userId, notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAllClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClearConfirm(true);
  };

  const handleClearAllConfirm = async () => {
    try {
      setClearing(true);
      await notificationService.clearAllNotifications(userId);
      await loadNotifications();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(userId, notification.id);
        await loadNotifications();
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    if (notification.relatedItemType === 'assignment' && notification.relatedItemId) {
      navigate('/courses');
      setIsOpen(false);
    } else {
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'overdue':
        return '🔴';
      case 'deadline-today':
        return '🟡';
      case 'deadline-soon':
        return '🟠';
      default:
        return '🔵';
    }
  };

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className={`fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/5 dark:ring-white/5 ${
        mobileMenuStyle ? 'z-[9999] w-[calc(100vw-2rem)] max-w-[360px]' : 'w-[360px]'
      }`}
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        maxHeight: 'min(85vh, 420px)',
      }}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header: title left | actions center | close right */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate flex-1 min-w-0">
          Notifications
        </h2>
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={handleClearAllClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear all</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setIsOpen(false)}
          className="flex-shrink-0 p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Close notifications"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* List or empty state */}
      <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              You're all caught up
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              New assignment reminders will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/80">
            {displayedNotifications.map((notification) => (
              <li key={notification.id}>
                <div
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                  }`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5" aria-hidden>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.isRead
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDate(notification.createdAt)} at {formatTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Mark as read"
                        aria-label="Mark as read"
                        style={{ minWidth: 36, minHeight: 36 }}
                      >
                        <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteOne(notification.id, e)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Remove notification"
                      aria-label="Remove notification"
                      style={{ minWidth: 36, minHeight: 36 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          if (onOpen && !isOpen) onOpen();
        }}
        className={`relative flex items-center justify-center rounded-xl transition-colors touch-manipulation ${
          mobileMenuStyle
            ? 'p-2 text-primary-600 dark:text-primary-400'
            : 'p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        style={{ minWidth: 44, minHeight: 44 }}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            aria-hidden
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (mobileMenuStyle ? createPortal(dropdownContent, document.body) : dropdownContent)}
      <ConfirmModal
        open={showClearConfirm}
        title="Clear all notifications?"
        message="This will remove all notifications. This cannot be undone."
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleClearAllConfirm}
        onCancel={() => setShowClearConfirm(false)}
        loading={clearing}
      />
    </div>
  );
}

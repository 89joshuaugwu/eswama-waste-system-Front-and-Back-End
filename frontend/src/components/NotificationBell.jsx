import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getSocket } from '../api/socket';

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n) => !n.is_read).length);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    }
    loadNotifications();

    const socket = getSocket();
    if (socket) {
      // Reload on any relevant event to keep it simple, or push directly.
      const handleNewNotification = () => loadNotifications();
      socket.on('report:new', handleNewNotification);
      socket.on('task:assigned', handleNewNotification);
      socket.on('report:resolved', handleNewNotification);

      return () => {
        socket.off('report:new', handleNewNotification);
        socket.off('task:assigned', handleNewNotification);
        socket.off('report:resolved', handleNewNotification);
      };
    }
  }, [user]);

  async function markAsRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-eswama-green focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20 border">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">No notifications yet.</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.notification_id}
                  className={`px-4 py-3 text-sm border-b cursor-pointer transition ${
                    n.is_read ? 'bg-white text-gray-600' : 'bg-blue-50 text-gray-800 font-medium'
                  } hover:bg-gray-100`}
                  onClick={() => !n.is_read && markAsRead(n.notification_id)}
                >
                  <p>{n.message}</p>
                  <span className="text-xs text-gray-400 block mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

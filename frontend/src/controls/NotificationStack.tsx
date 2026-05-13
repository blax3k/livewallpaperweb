import React from 'react';
import type { Notification } from '../hooks/useNotifications';

interface NotificationStackProps {
  notifications: Notification[];
}

export function NotificationStack({ notifications }: NotificationStackProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-stack">
      {notifications.map(n => (
        <div key={n.id} className="notification-card">
          {n.message}
        </div>
      ))}
    </div>
  );
}

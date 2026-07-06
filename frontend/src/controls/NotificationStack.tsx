import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { Notification } from '../hooks/useNotifications';
import './NotificationStack.scss';

interface NotificationStackProps {
  notifications: Notification[];
}

export function NotificationStack({ notifications }: NotificationStackProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-stack">
      {notifications.map(n => (
        <div key={n.id} className="notification-card">
          <CheckCircle size={14} className="notification-card__icon" />
          {n.message}
        </div>
      ))}
    </div>
  );
}

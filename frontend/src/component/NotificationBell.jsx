import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");

  const loadNotifications = async () => {
    try {
      const data = await apiRequest(
        "/notifications/",
        "GET",
        null,
        token
      );

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await apiRequest(
        "/notifications/unread-count",
        "GET",
        null,
        token
      );

      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    }
  };

  useEffect(() => {
    if (!token) return;

    loadNotifications();
    loadUnreadCount();

    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const markAsRead = async (notificationId) => {
    try {
      await apiRequest(
        `/notifications/${notificationId}/read`,
        "PATCH",
        null,
        token
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true
              }
            : notification
        )
      );

      setUnreadCount((previous) =>
        Math.max(previous - 1, 0)
      );
    } catch (error) {
      console.error(
        "Failed to mark notification:",
        error
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest(
        "/notifications/read-all",
        "PATCH",
        null,
        token
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark notifications:",
        error
      );
    }
  };

  const handleNotificationClick = async (
    notification
  ) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Close dropdown
    setOpen(false);

    // Open related task
    if (notification.task_id) {
      navigate(`/task/${notification.task_id}`);
      return;
    }

    // If there is no task but project exists
    if (notification.project_id) {
      navigate(`/project/${notification.project_id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "assignment":
        return "📋";

      case "review":
        return "👀";

      case "completed":
        return "✅";

      case "comment":
        return "💬";

      case "rejected":
        return "↩️";

      case "project":
        return "📁";

      default:
        return "🔔";
    }
  };

  return (
    <div className="notification-wrapper">

      {/* Notification Button */}
      <button
        type="button"
        className="notification-button"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        aria-label="Notifications"
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>


      {/* Notification Dropdown */}
      {open && (
        <div className="notification-dropdown">

          {/* Header */}
          <div className="notification-header">

            <div>
              <h3>Notifications</h3>

              {unreadCount > 0 && (
                <span>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-button"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}

          </div>


          {/* Notification List */}
          <div className="notification-list">

            {notifications.length === 0 ? (

              <div className="notification-empty">

                <div className="notification-empty-icon">
                  ✓
                </div>

                <p>No notifications</p>

                <span>
                  You're all caught up.
                </span>

              </div>

            ) : (

              notifications.map((notification) => (

                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read
                      ? ""
                      : "unread"
                  }`}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                >

                  {/* Icon */}
                  <div className="notification-icon">
                    {getNotificationIcon(
                      notification.type
                    )}
                  </div>


                  {/* Content */}
                  <div className="notification-content">

                    <strong>
                      {notification.title}
                    </strong>

                    <p>
                      {notification.message}
                    </p>

                  </div>


                  {/* Unread Dot */}
                  {!notification.is_read && (
                    <span className="notification-unread-dot"></span>
                  )}

                </div>

              ))

            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default NotificationBell;
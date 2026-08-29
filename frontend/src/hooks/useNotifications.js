import { useCallback, useEffect, useRef, useState } from "react";
import API from "../services/api";

const POLL_INTERVAL_MS = 45000;

// Polls an unread-count endpoint periodically (same pattern already used
// for /tenant/subscription) rather than real-time push — no new backend
// infrastructure needed for a notification bell.
export default function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const refetchCount = useCallback(async () => {
    try {
      const { data } = await API.get("/notifications/unread-count");
      if (!cancelledRef.current) setUnreadCount(data.count || 0);
    } catch {
      // Silent — a failed poll shouldn't surface an error to the user.
    }
  }, []);

  const refetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/notifications", { params: { limit: 20 } });
      if (!cancelledRef.current) setNotifications(data.notifications || []);
    } catch {
      // Silent.
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    refetchCount();
    refetchList();
    const interval = setInterval(refetchCount, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [refetchCount, refetchList]);

  const markAsRead = useCallback(async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent.
    }
  }, []);

  return { unreadCount, notifications, loading, markAsRead, markAllRead, refetch: refetchList };
}

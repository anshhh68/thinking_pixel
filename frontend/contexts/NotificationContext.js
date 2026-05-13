"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { register, unregister } from "../lib/pollScheduler";

const NotificationContext = createContext({ unreadCount: 0, recent: [], refresh: () => {}, markRead: () => {}, markAllRead: () => {} });

export function useNotifications() { return useContext(NotificationContext); }

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const prevEtag = useRef(null);
  const popupOpen = useRef(false);

  const fetchCount = useCallback(async () => {
    try {
      const headers = {};
      if (prevEtag.current) headers["If-None-Match"] = prevEtag.current;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api"}/notifications/unread-count`, {
        headers: { ...headers, Authorization: `Bearer ${localStorage.getItem("tp_token")}` },
      });
      if (res.status === 304) return; // nothing changed
      if (!res.ok) return;
      const etag = res.headers.get("ETag");
      const data = await res.json();
      if (etag !== prevEtag.current) {
        prevEtag.current = etag;
        setUnreadCount(data.count);
        // If popup is open, also refresh recent list
        if (popupOpen.current) fetchRecent();
      }
    } catch (_) {}
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const data = await api("/notifications/recent");
      setRecent(data || []);
    } catch (_) {}
  }, []);

  const refresh = useCallback(() => { fetchCount(); fetchRecent(); }, [fetchCount, fetchRecent]);

  const markRead = useCallback(async (id) => {
    setUnreadCount((c) => Math.max(0, c - 1));
    setRecent((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try { await api(`/notifications/${id}/read`, { method: "PATCH" }); } catch (_) { fetchCount(); }
  }, [fetchCount]);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setRecent((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await api("/notifications/read-all", { method: "PATCH" }); } catch (_) { fetchCount(); }
  }, [fetchCount]);

  useEffect(() => {
    const token = localStorage.getItem("tp_token");
    if (!token) return;
    register("notifications", 10000, fetchCount);
    return () => unregister("notifications");
  }, [fetchCount]);

  const setPopupOpen = useCallback((open) => {
    popupOpen.current = open;
    if (open) fetchRecent();
  }, [fetchRecent]);

  return (
    <NotificationContext.Provider value={{ unreadCount, recent, refresh, markRead, markAllRead, setPopupOpen }}>
      {children}
    </NotificationContext.Provider>
  );
}

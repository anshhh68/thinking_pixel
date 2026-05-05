"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Badge from "../../components/Badge";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = async (targetPage = page) => {
    try {
      const data = await api(
        `/notifications?paginated=true&page=${targetPage}&pageSize=10${onlyUnread ? "&unread=true" : ""}`
      );
      setItems(data.items || []);
      setMeta(data.meta || { page: targetPage, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load(page);
  }, [onlyUnread, page]);

  const markRead = async (id) => {
    await api(`/notifications/${id}/read`, { method: "PATCH" });
    load(page);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 16 }}>
        <h1 style={{ fontSize: 48 }}>Notifications</h1>
        <p className="text-muted">Real-time alerts across approvals, billing, and production workflow.</p>
      </section>
      {!!error && <p style={{ color: "red" }}>{error}</p>}
      <label className="text-muted">
        <input
          type="checkbox"
          checked={onlyUnread}
          onChange={(e) => setOnlyUnread(e.target.checked)}
        />{" "}
        Show unread only
      </label>
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span>
          Page {meta.page} / {meta.totalPages} (Total: {meta.total})
        </span>
        <button
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {items.map((n) => (
          <div
            key={n.id}
            className="panel"
            style={{ padding: 12, borderLeft: n.isRead ? "1px solid var(--border)" : "3px solid var(--primary)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{n.title}</strong>
              <Badge tone={n.isRead ? "default" : "primary"}>{n.type}</Badge>
            </div>
            <p className="text-muted" style={{ marginTop: 6 }}>{n.message}</p>
            <small className="text-muted">{new Date(n.createdAt).toLocaleString()}</small>
            {!n.isRead && <div style={{ marginTop: 8 }}>
                <button className="btn-outline" type="button" onClick={() => markRead(n.id)}>
                  Mark as read
                </button>
              </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

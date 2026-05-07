"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { Badge } from "../../components/ui";

const TYPE_COLORS = {
  LEAVE_REQUEST:    { color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  JOB_APPROVED:     { color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  HOD_REVIEW:       { color: "#22D3EE", soft: "rgba(34,211,238,0.13)" },
  INVOICE_OVERDUE:  { color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  GENERAL:          { color: "#7C7FF5", soft: "rgba(124,127,245,0.13)" },
};

export default function NotificationsPage() {
  const { t } = useTheme();
  const [items, setItems] = useState([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const load = (p = page) =>
    api(`/notifications?paginated=true&page=${p}&pageSize=20${onlyUnread ? "&unread=true" : ""}`)
      .then((d) => { setItems(d.items || []); setMeta(d.meta || {}); })
      .catch(() => null);

  useEffect(() => { load(page); }, [onlyUnread, page]);

  const markRead = async (id) => { await api(`/notifications/${id}/read`, { method: "PATCH" }); load(page); };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Notifications</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>{meta.total || 0} total</div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.text2, cursor: "pointer" }}>
          <input type="checkbox" checked={onlyUnread} onChange={(e) => { setOnlyUnread(e.target.checked); setPage(1); }} />
          Unread only
        </label>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((n) => {
          const tc = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL;
          return (
            <div key={n.id} style={{ background: t.surfaceBg, border: `1px solid ${n.isRead ? t.border : t.accent + "60"}`, borderLeft: `3px solid ${n.isRead ? t.border : t.accent}`, borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>{n.title}</span>
                  <Badge label={n.type} color={tc.color} soft={tc.soft} />
                  {!n.isRead && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 4 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: t.text3 }}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.isRead && (
                <button onClick={() => markRead(n.id)}
                  style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, color: t.text2, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Mark read
                </button>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div style={{ textAlign: "center", color: t.text3, padding: 40, fontSize: 13 }}>No notifications</div>}
      </div>

      {meta.totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: t.text2 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1, color: t.text2 }}>← Prev</button>
          <span>Page {meta.page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", cursor: page >= meta.totalPages ? "not-allowed" : "pointer", opacity: page >= meta.totalPages ? 0.4 : 1, color: t.text2 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

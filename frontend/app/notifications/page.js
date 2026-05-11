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
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bForm, setBForm] = useState({ audienceRole: "STAFF", title: "", message: "", type: "GENERAL" });
  const [sending, setSending] = useState(false);

  const user = (() => { try { return JSON.parse(localStorage.getItem("tp_user") || "{}"); } catch { return {}; } })();

  const sendBroadcast = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api("/notifications/broadcast", { method: "POST", body: JSON.stringify(bForm) });
      setBForm({ audienceRole: "STAFF", title: "", message: "", type: "GENERAL" });
      setShowBroadcast(false);
      load(page);
    } finally { setSending(false); }
  };

  const load = (p = page) =>
    api(`/notifications?paginated=true&page=${p}&pageSize=20${onlyUnread ? "&unread=true" : ""}`)
      .then((d) => { setItems(d.items || []); setMeta(d.meta || {}); })
      .catch(() => null);

  useEffect(() => { load(page); }, [onlyUnread, page]);

  const markRead = async (id) => { await api(`/notifications/${id}/read`, { method: "PATCH" }); load(page); };

  const inputStyle = { background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Notifications</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>{meta.total || 0} total</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {(user.role === "ADMIN" || user.role === "HOD") && (
            <button onClick={() => setShowBroadcast((v) => !v)}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {showBroadcast ? "Cancel" : "+ Broadcast"}
            </button>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.text2, cursor: "pointer" }}>
            <input type="checkbox" checked={onlyUnread} onChange={(e) => { setOnlyUnread(e.target.checked); setPage(1); }} />
            Unread only
          </label>
        </div>
      </div>

      {showBroadcast && (
        <form onSubmit={sendBroadcast}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Send Broadcast</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase" }}>Audience</label>
              <select style={inputStyle} value={bForm.audienceRole} onChange={(e) => setBForm({ ...bForm, audienceRole: e.target.value })}>
                <option value="STAFF">Staff</option>
                <option value="HOD">HOD</option>
                <option value="ADMIN">Admin</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase" }}>Type</label>
              <select style={inputStyle} value={bForm.type} onChange={(e) => setBForm({ ...bForm, type: e.target.value })}>
                <option value="GENERAL">General</option>
                <option value="HOD_REVIEW">HOD Review</option>
                <option value="INVOICE_OVERDUE">Invoice Overdue</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase" }}>Title *</label>
              <input required style={inputStyle} placeholder="Notification title" value={bForm.title}
                onChange={(e) => setBForm({ ...bForm, title: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase" }}>Message *</label>
            <textarea required rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Message body…"
              value={bForm.message} onChange={(e) => setBForm({ ...bForm, message: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={sending}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}

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

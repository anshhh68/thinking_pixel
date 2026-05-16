"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../lib/theme";
import { getStoredUser } from "../lib/auth";
import { useNotifications } from "../contexts/NotificationContext";
import { hasCap } from "../lib/permissions";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationBell({ t, isMobile }) {
  const router = useRouter();
  const { unreadCount, recent, markRead, markAllRead, setPopupOpen } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setPopupOpen(open);
  }, [open, setPopupOpen]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
    else router.push("/notifications");
  };

  const count = Math.min(unreadCount, 99);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: open ? t.accentSoft : t.border, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: t.text2, position: "relative" }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = t.borderStrong; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? t.accentSoft : t.border; }}>
        🔔
        {count > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "#EF4444", color: "#fff",
            borderRadius: "50%", minWidth: 16, height: 16,
            fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1, border: `2px solid ${t.navBg}`,
          }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="anim-down" style={{
          position: "absolute", right: isMobile ? -60 : 0, top: "calc(100% + 10px)",
          background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14,
          boxShadow: t.shadow || "0 10px 30px rgba(0,0,0,0.15)",
          width: isMobile ? "calc(100vw - 24px)" : 360, zIndex: 300,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text1 }}>Notifications</div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: "none", border: "none", color: t.accent, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {recent.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: t.text3, fontSize: 13 }}>No notifications yet</div>
            ) : (
              recent.map((n) => (
                <div key={n.id} onClick={() => handleClick(n)}
                  style={{
                    display: "flex", gap: 10, padding: "12px 16px", cursor: "pointer",
                    borderBottom: `1px solid ${t.border}`,
                    background: n.isRead ? "transparent" : t.accentSoft,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = t.border + "60"}
                  onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? "transparent" : t.accentSoft}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      {!n.isRead && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, fontWeight: n.isRead ? 500 : 700, color: t.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: t.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}` }}>
            <button onClick={() => { setOpen(false); router.push("/notifications"); }}
              style={{ width: "100%", background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px", color: t.text2, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onMenuClick, isMobile }) {
  const { t, isDark, toggle } = useTheme();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [user, setUser] = useState(null);
  const createRef = useRef(null);

  useEffect(() => { setUser(getStoredUser()); }, []);
  useEffect(() => {
    const handler = (e) => { if (createRef.current && !createRef.current.contains(e.target)) setShowCreate(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "—";

  const CREATE_ITEMS = [
    { label: "New Client",    href: "/clients",  icon: "◈", cap: "manageClients" },
    { label: "New Job",       href: "/jobs",     icon: "◉", cap: "manageJobs" },
    { label: "Leave Request", href: "/hr",       icon: "◎", cap: "updateTaskStatus" },
    { label: "New Invoice",   href: "/accounts", icon: "◆", cap: "manageInvoices" },
  ].filter((item) => !user?.role || hasCap(user.role, item.cap));

  return (
    <div style={{ height: 60, display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "0 12px" : "0 28px", background: t.navBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>

      {isMobile && (
        <button onClick={onMenuClick}
          style={{ background: "none", border: "none", color: t.text2, cursor: "pointer", fontSize: 20, padding: "4px 6px", borderRadius: 6, flexShrink: 0, lineHeight: 1, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ☰
        </button>
      )}

      {!isMobile && (
        <button style={{ display: "flex", alignItems: "center", gap: 10, background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", color: t.text3, cursor: "pointer", fontSize: 13, flex: 1, maxWidth: 340 }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.borderStrong)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}>
          <span style={{ fontSize: 14, opacity: 0.6 }}>⌕</span>
          <span>Search anything…</span>
          <kbd style={{ marginLeft: "auto", fontSize: 10, background: t.border, color: t.text3, padding: "2px 6px", borderRadius: 4 }}>⌘K</kbd>
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, marginLeft: "auto" }}>
        {!isMobile && (
          <button onClick={toggle} style={{ background: t.border, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, color: t.text2 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.borderStrong)}
            onMouseLeave={(e) => (e.currentTarget.style.background = t.border)}>
            {isDark ? "☀" : "◑"}
          </button>
        )}

        <NotificationBell t={t} isMobile={isMobile} />

        <div ref={createRef} style={{ position: "relative" }}>
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ background: t.accent, border: "none", borderRadius: 8, padding: isMobile ? "7px 12px" : "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = t.accent)}>
            {isMobile ? "+" : "+ Create"}
          </button>
          {showCreate && (
            <div className="anim-down" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 6, minWidth: 180, zIndex: 200, boxShadow: t.shadow }}>
              {CREATE_ITEMS.map((item) => (
                <button key={item.href} onClick={() => { router.push(item.href); setShowCreate(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "9px 12px", borderRadius: 7, color: t.text1, fontSize: 13, cursor: "pointer", textAlign: "left", minHeight: 44 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.border)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  <span style={{ fontSize: 14, color: t.accent }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
          {initials}
        </div>
      </div>
    </div>
  );
}

"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "../lib/theme";
import { clearSession, getStoredUser } from "../lib/auth";
import { ROLE_TABS } from "../lib/permissions";

const ALL_NAV = [
  { id: "dashboard",     href: "/dashboard",    label: "Dashboard",     icon: "▦" },
  { id: "clients",       href: "/clients",       label: "Clients",       icon: "◈" },
  { id: "jobs",          href: "/jobs",          label: "Jobs",          icon: "◉" },
  { id: "creative",      href: "/creative",      label: "Creative",      icon: "◇" },
  { id: "hr",            href: "/hr",            label: "HR",            icon: "◎" },
  { id: "accounts",      href: "/accounts",      label: "Accounts",      icon: "◆" },
  { id: "notifications", href: "/notifications", label: "Notifications", icon: "◐" },
  { id: "leadership",    href: "/leadership",    label: "Leadership",    icon: "◈" },
  { id: "approvals",     href: "/approvals/hod", label: "Approvals",     icon: "◑" },
  { id: "audit",         href: "/audit",         label: "Audit Logs",    icon: "◧" },
  { id: "chat",          href: "/chat",           label: "Chat",          icon: "◫" },
  { id: "jobsheet",      href: "/jobsheet",       label: "Job Sheet",     icon: "◩" },
];

export default function Sidebar({ isMobile, isOpen, onClose }) {
  const { t } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getStoredUser()); }, []);

  const allowed = ROLE_TABS[user?.role] || ROLE_TABS["STAFF"];
  const navItems = ALL_NAV.filter((n) => allowed.includes(n.id));

  // On mobile: always full width drawer; on desktop: collapsible
  const W = isMobile ? 260 : (collapsed ? 60 : 240);

  const logout = () => { clearSession(); router.replace("/login"); };

  const sidebarStyle = isMobile
    ? {
        position: "fixed", top: 0, left: 0, height: "100vh", width: W,
        background: t.sidebarBg, borderRight: `1px solid ${t.border}`,
        display: "flex", flexDirection: "column", zIndex: 200,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflowY: "auto",
      }
    : {
        width: W, minHeight: "100vh", background: t.sidebarBg,
        borderRight: `1px solid ${t.border}`, display: "flex",
        flexDirection: "column", transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden", flexShrink: 0,
      };

  return (
    <div style={sidebarStyle}>
      {/* Header */}
      <div style={{ padding: `0 ${(isMobile || !collapsed) ? 18 : 12}px`, display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${t.border}`, height: 60, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="7" width="7" height="7" rx="1.5" fill="white" opacity="0.9" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" />
            <rect x="10" y="10" width="4" height="4" rx="1" fill="white" opacity="0.5" />
          </svg>
        </div>
        {(isMobile || !collapsed) && (
          <span style={{ fontSize: 14, fontWeight: 700, color: t.text1, whiteSpace: "nowrap" }}>thinking pixel</span>
        )}
        {isMobile ? (
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 18, padding: 4, borderRadius: 6 }}>✕</button>
        ) : !collapsed ? (
          <button onClick={() => setCollapsed(true)} style={{ marginLeft: "auto", background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 14, padding: 4, borderRadius: 6 }}>←</button>
        ) : null}
      </div>

      {!isMobile && collapsed && (
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
          <button onClick={() => setCollapsed(false)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 14 }}>→</button>
        </div>
      )}

      {/* Nav items */}
      <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const showLabel = isMobile || !collapsed;
          return (
            <button key={item.id}
              onClick={() => { router.push(item.href); if (isMobile) onClose(); }}
              title={!showLabel ? item.label : undefined}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: showLabel ? "10px 10px" : "10px", justifyContent: showLabel ? "flex-start" : "center", background: isActive ? t.accentSoft : "none", border: `1px solid ${isActive ? t.accent + "40" : "transparent"}`, borderLeft: isActive && showLabel ? `2px solid ${t.accent}` : "2px solid transparent", borderRadius: 8, cursor: "pointer", color: isActive ? t.accent : t.text2, fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", width: "100%", textAlign: "left", minHeight: 44 }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.border; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "none"; }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {showLabel && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User footer */}
      <div style={{ padding: "10px 8px", borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {user ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "—"}
          </div>
          {(isMobile || !collapsed) && user && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: t.text3 }}>{user.role}</div>
            </div>
          )}
          {(isMobile || !collapsed) && (
            <button onClick={logout} title="Sign out" style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 14, padding: 4, borderRadius: 6, flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = t.red)}
              onMouseLeave={(e) => (e.currentTarget.style.color = t.text3)}>⎋</button>
          )}
        </div>
      </div>
    </div>
  );
}

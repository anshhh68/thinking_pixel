"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "../lib/theme";
import { clearSession, getStoredUser } from "../lib/auth";

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

// ─── RBAC: maps each role to the nav sections it can access ─────────────────
// Roles mirror the actual Thinking Pixel team structure:
//   Leadership │ Creative │ Motion/Video │ Strategy │ Accounts │ Finance │ HR
const ROLE_NAV = {
  // Full system access — owner / managing director
  ADMIN:                   ["dashboard","clients","jobs","creative","hr","accounts","notifications","leadership","approvals","audit","chat","jobsheet"],

  // Head of Department — cross-department oversight, approvals, no raw audit
  HOD:                     ["dashboard","clients","jobs","creative","hr","accounts","notifications","leadership","approvals","chat","jobsheet"],

  // Art Director / Creative Director — creative team lead, job pipeline, can approve tasks
  CREATIVE_DIRECTOR:       ["dashboard","clients","jobs","creative","notifications","leadership","approvals","chat"],

  // Senior Graphic Designer — executes and reviews creative work, peer approvals
  SENIOR_GRAPHIC_DESIGNER: ["dashboard","jobs","creative","notifications","approvals","chat"],

  // Graphic Designer — executes assigned creative tasks
  GRAPHIC_DESIGNER:        ["dashboard","jobs","creative","notifications","chat"],

  // Motion Graphics / Video Editor — production work only
  MOTION_VIDEO_EDITOR:     ["dashboard","jobs","creative","notifications","chat"],

  // Content Strategist — strategy-led, needs client context and job visibility
  CONTENT_STRATEGIST:      ["dashboard","clients","jobs","creative","notifications","chat"],

  // Account Manager — client relationships, job pipeline, financial overview
  ACCOUNT_MANAGER:         ["dashboard","clients","jobs","accounts","notifications","leadership","chat"],

  // Account Executive — client-facing ops, job tracking, no financials
  ACCOUNT_EXECUTIVE:       ["dashboard","clients","jobs","notifications","chat"],

  // Accountant / Finance — invoices, payments, audit trail
  ACCOUNTANT_FINANCE:      ["dashboard","accounts","notifications","audit"],

  // Compliance Officer — read-only audit and accounts
  COMPLIANCE_OFFICER:      ["dashboard","accounts","audit"],

  // HR Manager — people ops, attendance, leave management
  HR_MANAGER:              ["dashboard","hr","notifications","leadership","chat"],

  // General staff fallback — basic job and creative access
  STAFF:                   ["dashboard","jobs","creative","notifications","chat"],

  // External client — only accesses public /client-review/[token] (no sidebar nav)
  CLIENT:                  [],
};

export default function Sidebar() {
  const { t } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getStoredUser()); }, []);
  const allowed = ROLE_NAV[user?.role] || ROLE_NAV["STAFF"];
  const navItems = ALL_NAV.filter((n) => allowed.includes(n.id));
  const W = collapsed ? 60 : 240;

  const logout = () => { clearSession(); router.replace("/login"); };

  return (
    <div style={{ width: W, minHeight: "100vh", background: t.sidebarBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ padding: `0 ${collapsed ? 12 : 18}px`, display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${t.border}`, height: 60, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="7" width="7" height="7" rx="1.5" fill="white" opacity="0.9" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" />
            <rect x="10" y="10" width="4" height="4" rx="1" fill="white" opacity="0.5" />
          </svg>
        </div>
        {!collapsed && <span style={{ fontSize: 14, fontWeight: 700, color: t.text1, whiteSpace: "nowrap" }}>thinking pixel</span>}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ marginLeft: "auto", background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 14, padding: 4, borderRadius: 6 }}>←</button>
        )}
      </div>
      {collapsed && (
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
          <button onClick={() => setCollapsed(false)} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 14 }}>→</button>
        </div>
      )}

      <div style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <button key={item.id} onClick={() => router.push(item.href)} title={collapsed ? item.label : undefined}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "8px" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start", background: isActive ? t.accentSoft : "none", border: `1px solid ${isActive ? t.accent + "40" : "transparent"}`, borderLeft: isActive && !collapsed ? `2px solid ${t.accent}` : "2px solid transparent", borderRadius: 8, cursor: "pointer", color: isActive ? t.accent : t.text2, fontSize: 13, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", width: "100%", textAlign: "left" }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.border; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "none"; }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "10px 8px", borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {user ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "—"}
          </div>
          {!collapsed && user && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: t.text3 }}>{user.role}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} title="Sign out" style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 14, padding: 4, borderRadius: 6, flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = t.red)}
              onMouseLeave={(e) => (e.currentTarget.style.color = t.text3)}>⎋</button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../lib/theme";
import { getStoredUser } from "../lib/auth";

export default function Navbar() {
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

  // Roles that can perform each create action
  const CREATE_ITEMS = [
    {
      label: "New Client", href: "/clients", icon: "◈",
      roles: ["ADMIN","HOD","CREATIVE_DIRECTOR","CONTENT_STRATEGIST","ACCOUNT_MANAGER","ACCOUNT_EXECUTIVE"],
    },
    {
      label: "New Job", href: "/jobs", icon: "◉",
      roles: ["ADMIN","HOD","CREATIVE_DIRECTOR","SENIOR_GRAPHIC_DESIGNER","GRAPHIC_DESIGNER","MOTION_VIDEO_EDITOR","CONTENT_STRATEGIST","ACCOUNT_MANAGER","ACCOUNT_EXECUTIVE","STAFF"],
    },
    {
      label: "Leave Request", href: "/hr", icon: "◎",
      roles: ["ADMIN","HOD","CREATIVE_DIRECTOR","SENIOR_GRAPHIC_DESIGNER","GRAPHIC_DESIGNER","MOTION_VIDEO_EDITOR","CONTENT_STRATEGIST","ACCOUNT_MANAGER","ACCOUNT_EXECUTIVE","ACCOUNTANT_FINANCE","COMPLIANCE_OFFICER","HR_MANAGER","STAFF"],
    },
    {
      label: "New Invoice", href: "/accounts", icon: "◆",
      roles: ["ADMIN","HOD","ACCOUNT_MANAGER","ACCOUNTANT_FINANCE"],
    },
  ].filter((item) => !user?.role || item.roles.includes(user.role));

  return (
    <div style={{ height: 60, display: "flex", alignItems: "center", gap: 12, padding: "0 28px", background: t.navBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
      <button style={{ display: "flex", alignItems: "center", gap: 10, background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", color: t.text3, cursor: "pointer", fontSize: 13, flex: 1, maxWidth: 340 }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.borderStrong)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}>
        <span style={{ fontSize: 14, opacity: 0.6 }}>⌕</span>
        <span>Search anything…</span>
        <kbd style={{ marginLeft: "auto", fontSize: 10, background: t.border, color: t.text3, padding: "2px 6px", borderRadius: 4 }}>⌘K</kbd>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
        <button onClick={toggle} style={{ background: t.border, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, color: t.text2 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.borderStrong)}
          onMouseLeave={(e) => (e.currentTarget.style.background = t.border)}>
          {isDark ? "☀" : "◑"}
        </button>

        <button onClick={() => router.push("/notifications")} style={{ background: t.border, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: t.text2 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.borderStrong)}
          onMouseLeave={(e) => (e.currentTarget.style.background = t.border)}>
          🔔
        </button>

        <div ref={createRef} style={{ position: "relative" }}>
          <button onClick={() => setShowCreate(!showCreate)}
            style={{ background: t.accent, border: "none", borderRadius: 8, padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = t.accent)}>
            + Create
          </button>
          {showCreate && (
            <div className="anim-down" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 6, minWidth: 180, zIndex: 200, boxShadow: t.shadow }}>
              {CREATE_ITEMS.map((item) => (
                <button key={item.href} onClick={() => { router.push(item.href); setShowCreate(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "9px 12px", borderRadius: 7, color: t.text1, fontSize: 13, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.border)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                  <span style={{ fontSize: 14, color: t.accent }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
          {initials}
        </div>
      </div>
    </div>
  );
}

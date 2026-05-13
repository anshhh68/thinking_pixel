"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { getStoredUser } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { useIsMobile } from "../lib/useBreakpoint";
import { NotificationProvider } from "../contexts/NotificationContext";

const PUBLIC = ["/login", "/client-review"];

const ROLE_PATHS = {
  ADMIN:  ["/dashboard", "/clients", "/jobs", "/creative", "/hr", "/accounts", "/leadership", "/notifications", "/audit", "/approvals", "/chat", "/jobsheet"],
  HOD:    ["/dashboard", "/jobs", "/creative", "/notifications", "/approvals", "/chat", "/jobsheet"],
  STAFF:  ["/dashboard", "/jobs", "/creative", "/notifications", "/chat"],
  CLIENT: [],
};

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTheme();
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const user = getStoredUser();
    if (!isPublic && !user) { router.replace("/login"); return; }
    if (user && !isPublic) {
      const allowed = ROLE_PATHS[user.role] || [];
      const canAccess = allowed.some((p) => pathname.startsWith(p));
      if (!canAccess) { router.replace("/dashboard"); return; }
    }
    setReady(true);
  }, [isPublic, pathname, router]);

  if (isPublic) return <>{children}</>;
  if (!ready) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.contentBg }}>
      <div style={{ fontSize: 13, color: t.text3 }}>Loading…</div>
    </div>
  );

  return (
    <NotificationProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.contentBg }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }} />
        )}

        <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} isMobile={isMobile} />
          <main className="anim-fade" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}

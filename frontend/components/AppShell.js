"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { getStoredUser } from "../lib/auth";
import { useTheme } from "../lib/theme";

const PUBLIC = ["/login", "/client-review"];

const ROLE_PATHS = {
  ADMIN:  ["/dashboard", "/clients", "/jobs", "/creative", "/hr", "/accounts", "/leadership", "/notifications", "/audit", "/approvals"],
  HOD:    ["/dashboard", "/jobs", "/creative", "/notifications", "/approvals"],
  STAFF:  ["/dashboard", "/jobs", "/creative", "/notifications"],
  CLIENT: [],
};

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTheme();
  const [ready, setReady] = useState(false);
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.contentBg }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar />
        <main className="anim-fade" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

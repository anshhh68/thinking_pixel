"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isPublicScreen = pathname.startsWith("/login") || pathname.startsWith("/client-review");

  if (isPublicScreen) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <section className="app-main">
        <TopBar />
        <main className="page-wrap">{children}</main>
      </section>
    </div>
  );
}

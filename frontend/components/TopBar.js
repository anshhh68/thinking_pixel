"use client";

import { usePathname } from "next/navigation";

function getTitle(pathname) {
  if (pathname.startsWith("/jobs")) return "Jobs";
  if (pathname.startsWith("/hr")) return "Talent";
  if (pathname.startsWith("/creative")) return "Studio";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/accounts")) return "Capital";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/leadership")) return "Leadership";
  if (pathname.startsWith("/approvals")) return "Approvals";
  return "Command Center";
}

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-title">{getTitle(pathname)}</div>
      <div className="topbar-controls">
        <input className="search-input" placeholder="Search tasks, clients..." />
        <button className="icon-btn" type="button" aria-label="notifications">
          🔔
        </button>
        <button className="icon-btn" type="button" aria-label="settings">
          ⚙
        </button>
        <button className="icon-btn" type="button" aria-label="profile">
          👤
        </button>
      </div>
    </header>
  );
}

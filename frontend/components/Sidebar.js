"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Command" },
  { href: "/jobs", label: "Jobs" },
  { href: "/hr", label: "Talent" },
  { href: "/creative", label: "Studio" },
  { href: "/clients", label: "Clients" },
  { href: "/accounts", label: "Capital" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>THINKING PIXEL</h1>
        <p>Digital Atelier</p>
      </div>
      <nav className="nav-group">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? "active" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button className="new-project-btn" type="button">
        + New Project
      </button>
    </aside>
  );
}

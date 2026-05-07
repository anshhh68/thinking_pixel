"use client";

export function Avatar({ name, size = 32, bg, t }) {
  const initials = name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
  return (
    <div style={{ width: size, height: size, borderRadius: size / 3, background: bg || t?.accent || "#F05A22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export function Badge({ label, color, soft }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: soft, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{label}</span>
  );
}

const STATUS_MAP = {
  HIGH:             { label: "HIGH",           color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  MEDIUM:           { label: "MEDIUM",         color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  LOW:              { label: "LOW",            color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  PENDING:          { label: "Pending",        color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  APPROVED:         { label: "Approved",       color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  REJECTED:         { label: "Rejected",       color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  IN_PROGRESS:      { label: "In Progress",    color: "#7C7FF5", soft: "rgba(124,127,245,0.13)" },
  DONE:             { label: "Done",           color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  HOD_REVIEW:       { label: "HOD Review",     color: "#22D3EE", soft: "rgba(34,211,238,0.13)" },
  CLIENT_APPROVED:  { label: "Client Approved",color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  OPEN:             { label: "Open",           color: "#7C7FF5", soft: "rgba(124,127,245,0.13)" },
  PAID:             { label: "Paid",           color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  OVERDUE:          { label: "Overdue",        color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  DRAFT:            { label: "Draft",          color: "#828899", soft: "rgba(130,136,153,0.13)" },
  PRESENT:          { label: "Present",        color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  ABSENT:           { label: "Absent",         color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  LEAVE:            { label: "Leave",          color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  PENDING_CLIENT:   { label: "Pending Client", color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
};

export function StatusBadge({ status, t }) {
  const m = STATUS_MAP[status] || { label: status || "—", color: t?.text3 || "#888", soft: "rgba(128,128,128,0.1)" };
  return <Badge label={m.label} color={m.color} soft={m.soft} />;
}

export function ProgressBar({ value = 0, color, t }) {
  return (
    <div style={{ height: 4, borderRadius: 99, background: t?.border || "#232838", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: color || "#F05A22", borderRadius: 99 }} />
    </div>
  );
}

export function PriorityDot({ priority, t }) {
  const colors = { HIGH: "#F87171", MEDIUM: "#F59E0B", LOW: "#10B981" };
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[priority] || t?.text3 || "#888", flexShrink: 0 }} />;
}

export function Stat({ label, value, icon, t }) {
  return (
    <div style={{ flex: 1, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 12, color: t.text3, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>{value || "—"}</div>
    </div>
  );
}

export function AccentButton({ children, onClick, t }) {
  const color = "#F05A22";
  return (
    <button onClick={onClick}
      style={{ background: color, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#D94E1C")}
      onMouseLeave={(e) => (e.currentTarget.style.background = color)}>
      {children}
    </button>
  );
}

export function TableWrapper({ children, t }) {
  return (
    <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  );
}

export function THead({ cols, t }) {
  return (
    <thead>
      <tr style={{ background: t.contentBg }}>
        {cols.map((c) => (
          <th key={c} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}` }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

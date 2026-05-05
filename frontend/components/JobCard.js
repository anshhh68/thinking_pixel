import Badge from "./Badge";

export default function JobCard({
  title,
  client,
  description,
  status,
  progress = 0,
  tone = "secondary",
}) {
  const pct = Math.max(0, Math.min(100, progress));

  return (
    <article className="panel" style={{ padding: 12, display: "grid", gap: 10 }}>
      <div
        style={{
          height: 118,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background:
            "radial-gradient(circle at top right, rgba(217,0,255,0.18), transparent 50%), radial-gradient(circle at bottom left, rgba(242,109,43,0.2), transparent 55%), #111",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Badge tone={tone}>{status || "OPEN"}</Badge>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {client || "No client"}
        </span>
      </div>
      <h4 style={{ fontSize: 22 }}>{title}</h4>
      <p className="text-muted" style={{ fontSize: 13 }}>
        {description || "No description"}
      </p>
      <div
        style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--secondary), var(--primary))",
          }}
        />
      </div>
    </article>
  );
}

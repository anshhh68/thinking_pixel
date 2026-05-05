export default function KpiCard({ title, value, subtitle, accent = "var(--primary)" }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <p className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
        {title}
      </p>
      <h3 style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>{value}</h3>
      <div
        style={{
          width: "100%",
          height: 5,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          marginBottom: 8,
        }}
      >
        <div style={{ width: "62%", height: "100%", borderRadius: 999, background: accent }} />
      </div>
      <p className="text-muted" style={{ fontSize: 12 }}>
        {subtitle}
      </p>
    </div>
  );
}

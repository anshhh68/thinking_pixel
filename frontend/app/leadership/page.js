"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { ProgressBar } from "../../components/ui";

export default function LeadershipPage() {
  const { t } = useTheme();
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/leadership/kpis").then(setKpis).catch((e) => setError(e.message));
  }, []);

  if (error) return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Leadership</div>
      <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "14px 18px", color: t.red, fontSize: 13 }}>
        Failed to load KPIs: {error}. Please refresh the page.
      </div>
    </div>
  );

  const K = kpis;
  const statCard = (label, value, sub, color) => (
    <div style={{ flex: 1, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 12, color: t.text3, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || t.text1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 12, color: t.text2, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Leadership</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>Agency-wide pulse across HR, jobs, and finance</div>
      </div>

      {!K && <div style={{ color: t.text3, fontSize: 13 }}>Loading…</div>}

      {K && (
        <>
          <div style={{ display: "flex", gap: 14 }}>
            {statCard("Team Size",       K.hr?.totalEmployees,          `Pending leave: ${K.hr?.pendingLeaves}`,       t.indigo)}
            {statCard("Total Jobs",      K.jobs?.total,                 `Open: ${K.jobs?.open}`,                       t.accent)}
            {statCard("Tasks Active",    K.tasks?.inProgress,           `Rework: ${K.tasks?.rework}`,                  t.amber)}
            {statCard("Overdue Invoices",K.finance?.overdueCount,       `Outstanding: ₹${K.finance?.outstandingAmount}`,t.red)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 16 }}>HR Overview</div>
              {[
                ["Present today",  K.hr?.attendanceToday?.PRESENT, t.emerald],
                ["Absent today",   K.hr?.attendanceToday?.ABSENT,  t.red],
                ["On leave today", K.hr?.attendanceToday?.LEAVE,   t.amber],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: t.text2 }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{val ?? 0}</span>
                </div>
              ))}
            </div>

            <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 16 }}>Finance Summary</div>
              {[
                ["Total invoiced",  `₹${K.finance?.totalInvoiced ?? 0}`],
                ["Total collected", `₹${K.finance?.totalCollected ?? 0}`],
                ["Overdue amount",  `₹${K.finance?.outstandingAmount ?? 0}`],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: t.text2 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text1, fontFamily: "var(--font-mono),monospace" }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 16 }}>Jobs Pipeline</div>
              {[
                ["Open",            K.jobs?.open,          K.jobs?.total, t.indigo],
                ["Client review",   K.jobs?.clientReview,  K.jobs?.total, t.amber],
                ["Approved",        K.jobs?.approved,      K.jobs?.total, t.emerald],
              ].map(([label, val, total, color]) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: t.text2 }}>{label}</span>
                    <span style={{ fontSize: 12, color: t.text3 }}>{val ?? 0} / {total ?? 0}</span>
                  </div>
                  <ProgressBar value={total ? ((val ?? 0) / total) * 100 : 0} color={color} t={t} />
                </div>
              ))}
            </div>

            <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 16 }}>Tasks Breakdown</div>
              {[
                ["To Do",           K.tasks?.todo,          t.text3],
                ["In Progress",     K.tasks?.inProgress,    t.indigo],
                ["Ready for review",K.tasks?.readyForReview,t.amber],
                ["Rework",          K.tasks?.rework,        t.red],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: t.text2 }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{val ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

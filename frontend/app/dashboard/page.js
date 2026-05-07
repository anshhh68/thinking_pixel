"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { getStoredUser } from "../../lib/auth";
import { StatusBadge, ProgressBar } from "../../components/ui";

const COLS = [
  { key: "PENDING",    label: "Pending",      color: "#F59E0B" },
  { key: "IN_PROGRESS",label: "In Progress",  color: "#7C7FF5" },
  { key: "HOD_REVIEW", label: "HOD Review",   color: "#22D3EE" },
  { key: "CLIENT_APPROVED", label: "Approved",color: "#10B981" },
  { key: "DONE",       label: "Done",         color: "#10B981" },
];

export default function DashboardPage() {
  const { t } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getStoredUser());
    api("/jobs?paginated=true&page=1&pageSize=50").then((r) => setJobs(r?.items || [])).catch(() => null);
    api("/leadership/kpis").then(setKpis).catch(() => null);
  }, []);

  const byStatus = (key) => jobs.filter((j) => j.status === key);

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Dashboard</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>
          Welcome back, <span style={{ color: t.text1, fontWeight: 500 }}>{user?.name || "—"}</span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 14 }}>
        {[
          { label: "Total Jobs",   value: kpis?.jobs?.total ?? jobs.length, icon: "◉" },
          { label: "In Progress",  value: kpis?.tasks?.inProgress ?? "—",   icon: "◑" },
          { label: "Team Size",    value: kpis?.hr?.totalEmployees ?? "—",  icon: "◎" },
          { label: "Pending Approval", value: byStatus("HOD_REVIEW").length, icon: "◈" },
        ].map((k) => (
          <div key={k.label} style={{ flex: 1, background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: t.text3, marginBottom: 8 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: "flex", gap: 14, flex: 1, overflowX: "auto", minHeight: 0 }}>
        {COLS.map((col) => {
          const colJobs = byStatus(col.key);
          return (
            <div key={col.key} style={{ minWidth: 220, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: t.text2 }}>{col.label}</span>
                <span style={{ fontSize: 11, color: t.text3, marginLeft: "auto" }}>{colJobs.length}</span>
              </div>
              {colJobs.map((job) => (
                <div key={job.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: t.text3, fontFamily: "var(--font-mono),monospace", marginBottom: 4 }}>{job.id?.slice(0, 8)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text1, marginBottom: 6 }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: t.text2, marginBottom: 8 }}>{job.client?.name || "—"}</div>
                  <ProgressBar value={job.progress || 0} color={col.color} t={t} />
                </div>
              ))}
              {colJobs.length === 0 && (
                <div style={{ border: `1px dashed ${t.border}`, borderRadius: 10, padding: "24px 14px", textAlign: "center", color: t.text3, fontSize: 12 }}>Empty</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

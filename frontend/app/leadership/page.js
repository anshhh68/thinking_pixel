"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import KpiCard from "../../components/KpiCard";

export default function LeadershipPage() {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/leadership/kpis")
      .then(setKpis)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!kpis) return <p>Loading leadership KPIs...</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 16 }}>
        <h1 style={{ fontSize: 50 }}>Leadership Dashboard</h1>
        <p className="text-muted">Cross-module pulse across HR, jobs, tasks, and financial runway.</p>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 12 }}>
        <KpiCard title="Employees" value={kpis.hr.totalEmployees} subtitle={`Pending leaves: ${kpis.hr.pendingLeaves}`} accent="var(--primary)" />
        <KpiCard title="Total Jobs" value={kpis.jobs.total} subtitle={`Open: ${kpis.jobs.open}`} accent="var(--secondary)" />
        <KpiCard title="Tasks In Progress" value={kpis.tasks.inProgress} subtitle={`Rework: ${kpis.tasks.rework}`} accent="var(--tertiary)" />
        <KpiCard title="Overdue Invoices" value={kpis.finance.overdueCount} subtitle={`Outstanding: ${kpis.finance.outstandingAmount}`} accent="var(--danger)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(260px, 1fr))", gap: 12 }}>
        <div className="panel" style={{ padding: 14 }}>
          <h3>HR Metrics</h3>
          <p className="text-muted">Attendance today (P/A/L): {kpis.hr.attendanceToday.PRESENT}/{kpis.hr.attendanceToday.ABSENT}/{kpis.hr.attendanceToday.LEAVE}</p>
        </div>
        <div className="panel" style={{ padding: 14 }}>
          <h3>Finance Metrics</h3>
          <p className="text-muted">Total invoiced: {kpis.finance.totalInvoiced}</p>
          <p className="text-muted">Total collected: {kpis.finance.totalCollected}</p>
        </div>
        <div className="panel" style={{ padding: 14 }}>
          <h3>Jobs Breakdown</h3>
          <p className="text-muted">Client review: {kpis.jobs.clientReview}</p>
          <p className="text-muted">Approved: {kpis.jobs.approved}</p>
        </div>
        <div className="panel" style={{ padding: 14 }}>
          <h3>Task Breakdown</h3>
          <p className="text-muted">TODO: {kpis.tasks.todo}</p>
          <p className="text-muted">Ready for review: {kpis.tasks.readyForReview}</p>
        </div>
      </div>
    </div>
  );
}

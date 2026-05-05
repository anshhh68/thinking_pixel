"use client";

import { useEffect, useMemo, useState } from "react";
import KpiCard from "../../components/KpiCard";
import JobCard from "../../components/JobCard";
import { api } from "../../lib/api";

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [jobs, setJobs] = useState([]);

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("tp_user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    api("/leadership/kpis").then(setKpis).catch(() => null);
    api("/jobs?paginated=true&page=1&pageSize=6")
      .then((r) => setJobs(r.items || []))
      .catch(() => null);
  }, []);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        className="panel"
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "1.1fr 360px",
          gap: 16,
          background:
            "radial-gradient(circle at 70% 20%, rgba(217,0,255,0.2), transparent 45%), radial-gradient(circle at 10% 50%, rgba(242,109,43,0.15), transparent 40%), #141414",
        }}
      >
        <div>
          <p className="chip" style={{ marginBottom: 12, width: "fit-content" }}>
            SYSTEM ONLINE
          </p>
          <h1 style={{ fontSize: 72, lineHeight: 0.92 }}>
            Welcome back,
            <br />
            <span style={{ color: "var(--primary)" }}>{user?.role || "Creative"}</span>{" "}
            <span style={{ color: "var(--secondary)" }}>Director.</span>
          </h1>
          <p className="text-muted" style={{ marginTop: 14, maxWidth: 580 }}>
            Logged in as {user?.name || "Unknown"}. Track studio throughput, client approvals, and
            financial runway from one command center.
          </p>
        </div>
        <div className="panel" style={{ padding: 14 }}>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Project Spotlight
          </p>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              height: 250,
              background:
                "radial-gradient(circle at center, rgba(255,0,122,0.2), transparent 35%), radial-gradient(circle at top left, rgba(242,109,43,0.24), transparent 45%), #0f0f0f",
            }}
          />
          <p style={{ marginTop: 10 }}>Project: Neon Genesis</p>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
        <KpiCard
          title="Throughput Velocity"
          value={kpis?.tasks?.inProgress ?? "--"}
          subtitle="Tasks currently in active production"
          accent="var(--primary)"
        />
        <KpiCard
          title="Active Campaigns"
          value={kpis?.jobs?.total ?? "--"}
          subtitle="All job pipelines currently tracked"
          accent="var(--secondary)"
        />
        <KpiCard
          title="Studio Capacity"
          value={`${kpis?.hr?.totalEmployees ?? "--"}`}
          subtitle="Team members available in roster"
          accent="var(--tertiary)"
        />
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ fontSize: 42 }}>Active Jobs</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 14 }}>
          {jobs.slice(0, 3).map((job) => (
            <JobCard
              key={job.id}
              title={job.title}
              client={job.client?.name}
              status={job.status}
              description={job.tasks?.[0]?.description}
              progress={Math.min(100, (job.tasks?.filter((t) => t.status === "DONE").length || 0) * 30)}
            />
          ))}
        </div>
      </section>
      <p className="text-muted">
        Agency Pulse combines HR, job flow, approvals, billing, and notification activity in a
        single creative operating layer.
      </p>
    </div>
  );
}

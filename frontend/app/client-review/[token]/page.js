"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export default function ClientReviewPage() {
  const { token } = useParams();
  const [job, setJob] = useState(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const flattenedTasks = useMemo(() => {
    return (job?.tasks || []).map((t) => ({ ...t, latest: t.versions?.[0] }));
  }, [job]);

  const load = async () => {
    if (!token) return;
    try {
      setError("");
      const res = await fetch(`${API_BASE}/jobs/public/${token}`);
      if (!res.ok) throw new Error("Invalid or expired review link");
      const data = await res.json();
      setJob(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const submitDecision = async (status) => {
    setMessage("");
    const res = await fetch(`${API_BASE}/jobs/public/${token}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to submit decision" }));
      setError(err.message);
      return;
    }
    setMessage(`Decision submitted: ${status}`);
    load();
  };

  if (error) return <p style={{ color: "var(--danger)", padding: 20 }}>{error}</p>;
  if (!job) return <p style={{ padding: 20 }}>Loading review details...</p>;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 28,
        background:
          "radial-gradient(circle at top right, rgba(255,0,122,0.15), transparent 40%), radial-gradient(circle at top left, rgba(242,109,43,0.16), transparent 45%), #0c0c0c",
      }}
    >
      <section className="panel" style={{ maxWidth: 980, margin: "0 auto", padding: 20, display: "grid", gap: 12 }}>
        <p className="chip" style={{ width: "fit-content" }}>
          Client Review Portal
        </p>
        <h1 style={{ fontSize: 54, lineHeight: 0.95 }}>{job.title}</h1>
        <p className="text-muted">Client: {job.client?.name}</p>
        <p>
          Current status: <strong>{job.clientApprovalStatus}</strong>
        </p>
        <h3 style={{ marginTop: 8 }}>Deliverables ready for review</h3>
        <div className="card-grid">
          {flattenedTasks.map((task) => (
            <div key={task.id} className="panel" style={{ padding: 10 }}>
              <p>{task.description}</p>
              <p className="text-muted" style={{ fontSize: 12 }}>
                {task.latest ? `Latest v${task.latest.versionNumber}` : "No uploads yet"}
              </p>
            </div>
          ))}
        </div>
        <textarea
          className="textarea"
          placeholder="Feedback comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button className="btn-primary" type="button" onClick={() => submitDecision("APPROVED")}>
            Approve
          </button>
          <button className="btn-outline" type="button" onClick={() => submitDecision("REJECTED")}>
            Reject and send to rework
          </button>
        </div>
        {!!message && <p style={{ color: "var(--success)" }}>{message}</p>}
      </section>
    </div>
  );
}

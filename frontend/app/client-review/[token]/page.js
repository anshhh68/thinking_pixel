"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

const DARK = {
  bg: "#0E0E10", surface: "#18181B", border: "#27272A",
  text1: "#FAFAFA", text2: "#A1A1AA", text3: "#52525B",
  accent: "#7C7FF5", emerald: "#10B981", red: "#F87171",
};

export default function ClientReviewPage() {
  const { token } = useParams();
  const t = DARK;
  const [job, setJob] = useState(null);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const flattenedTasks = useMemo(() => (job?.tasks || []).map((task) => ({ ...task, latest: task.versions?.[0] })), [job]);

  const load = async () => {
    if (!token) return;
    try {
      setError("");
      const res = await fetch(`${API_BASE}/jobs/public/${token}`);
      if (!res.ok) throw new Error("Invalid or expired review link");
      setJob(await res.json());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, [token]);

  const submitDecision = async (status) => {
    setMessage(""); setSubmitting(true);
    try {
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
      setMessage(status === "APPROVED" ? "Your approval has been recorded. Thank you!" : "Feedback submitted. The team will review your comments.");
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "10px 14px", color: t.text1, fontSize: 14, outline: "none",
    fontFamily: "system-ui, sans-serif", width: "100%", boxSizing: "border-box", resize: "vertical",
  };

  if (error) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
        <div style={{ fontSize: 16, color: t.red, fontWeight: 600, marginBottom: 8 }}>Link Error</div>
        <div style={{ fontSize: 14, color: t.text2 }}>{error}</div>
      </div>
    </div>
  );

  if (!job) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: t.text2, fontFamily: "system-ui, sans-serif" }}>Loading review details…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="7" width="7" height="7" rx="1.5" fill="white" opacity="0.9" />
              <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" />
              <rect x="10" y="10" width="4" height="4" rx="1" fill="white" opacity="0.5" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.text1 }}>thinking pixel</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: t.text3, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 10px" }}>Client Review Portal</span>
        </div>

        {/* Job overview */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 12, color: t.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{job.client?.name}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text1, marginBottom: 8 }}>{job.title}</div>
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: t.text2 }}>
            <span>Status: <strong style={{ color: t.text1 }}>{job.clientApprovalStatus || job.status}</strong></span>
            <span>{flattenedTasks.length} deliverable(s)</span>
          </div>
        </div>

        {/* Deliverables */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 12 }}>Deliverables</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {flattenedTasks.map((task) => (
              <div key={task.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.text1, marginBottom: 6 }}>{task.description}</div>
                <div style={{ fontSize: 12, color: task.latest ? t.emerald : t.text3 }}>
                  {task.latest ? `Latest: v${task.latest.versionNumber}` : "No uploads yet"}
                </div>
                {task.latest && (
                  <a href={task.latest.fileUrl} target="_blank" rel="noreferrer"
                    style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: t.accent }}>
                    View file →
                  </a>
                )}
              </div>
            ))}
            {flattenedTasks.length === 0 && (
              <div style={{ color: t.text3, fontSize: 13 }}>No deliverables yet</div>
            )}
          </div>
        </div>

        {/* Decision section */}
        {!message ? (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Your Decision</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: t.text2 }}>Feedback / Comments</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on the deliverables…" rows={4}
                style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => submitDecision("APPROVED")} disabled={submitting}
                style={{ flex: 1, background: t.emerald, border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Submitting…" : "Approve"}
              </button>
              <button onClick={() => submitDecision("REJECTED")} disabled={submitting}
                style={{ flex: 1, background: "none", border: `1px solid ${t.red}`, borderRadius: 10, padding: "13px", color: t.red, fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                Request Changes
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.emerald}40`, borderRadius: 16, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.emerald, marginBottom: 8 }}>Decision Submitted</div>
            <div style={{ fontSize: 14, color: t.text2 }}>{message}</div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: t.text3 }}>
          Powered by thinking pixel IMS
        </div>
      </div>
    </div>
  );
}

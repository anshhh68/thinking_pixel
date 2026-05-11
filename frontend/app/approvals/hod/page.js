"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useTheme } from "../../../lib/theme";
import { StatusBadge } from "../../../components/ui";

export default function HodApprovalsPage() {
  const { t } = useTheme();
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api("/jobs/hod/queue").then(setQueue).catch(() => null);
  useEffect(() => { load(); }, []);

  const decide = async (status) => {
    if (!selected) return;
    setSubmitting(true);
    setMsg("");
    try {
      await api(`/jobs/tasks/${selected.id}/hod-decision`, {
        method: "PATCH",
        body: JSON.stringify({ status, comment }),
      });
      setMsg(status === "APPROVED" ? "Approved successfully." : "Returned for rework.");
      setSelected(null);
      setComment("");
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>HOD Approvals</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>Review tasks pending your approval</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* Queue list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {queue.length === 0 && (
            <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: t.text3, fontSize: 13 }}>
              No tasks pending review
            </div>
          )}
          {queue.map((task) => (
            <div key={task.id}
              onClick={() => { setSelected(task); setComment(""); setMsg(""); }}
              style={{
                background: selected?.id === task.id ? t.accentSoft : t.surfaceBg,
                border: `1px solid ${selected?.id === task.id ? t.accent + "60" : t.border}`,
                borderRadius: 12, padding: "16px 20px", cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 2 }}>{task.description}</div>
                  <div style={{ fontSize: 12, color: t.accent }}>{task.job?.title || "—"}</div>
                </div>
                <StatusBadge status={task.status} t={t} />
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.text3 }}>
                {task.assignedTo && <span>Assigned to {task.assignedTo}</span>}
                {task.versions?.length > 0 && <span>{task.versions.length} version(s)</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Decision panel */}
        <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, position: "sticky", top: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 16 }}>Decision</div>
          {!selected ? (
            <div style={{ color: t.text3, fontSize: 13 }}>Select a task to review</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text1, marginBottom: 4 }}>{selected.description}</div>
                <div style={{ fontSize: 12, color: t.text2 }}>{selected.job?.title}</div>
              </div>

              {selected.versions?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Uploaded Versions</div>
                  {selected.versions.map((v) => (
                    <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: t.text2, marginBottom: 4 }}>
                      <span>v{v.versionNumber}</span>
                      <a href={v.fileUrl} target="_blank" rel="noreferrer" style={{ color: t.accent }}>View file</a>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Comment (optional)</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Leave feedback for the creative team…" rows={3}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              {msg && (
                <div style={{ fontSize: 13, color: msg.includes("successfully") ? t.emerald : t.red, background: msg.includes("successfully") ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)", borderRadius: 7, padding: "8px 12px" }}>
                  {msg}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => decide("APPROVED")} disabled={submitting}
                  style={{ flex: 1, background: t.emerald, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                  Approve
                </button>
                <button onClick={() => decide("REJECTED")} disabled={submitting}
                  style={{ flex: 1, background: t.red, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                  Request Rework
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { StatusBadge, ProgressBar } from "../../components/ui";

const EMPTY_JOB = { clientId: "", title: "", owner: "", dueDate: "", priority: "MEDIUM" };
const EMPTY_TASK = { description: "", assignedTo: "", dueDate: "" };

export default function JobsPage() {
  const { t } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [saving, setSaving] = useState(false);
  const [taskForms, setTaskForms] = useState({});
  const [reviewLinks, setReviewLinks] = useState({});
  const [expandedJob, setExpandedJob] = useState(null);
  const [error, setError] = useState("");

  const load = (p = page) =>
    Promise.all([
      api(`/jobs?paginated=true&page=${p}&pageSize=12`),
      api("/clients"),
    ]).then(([jobsData, clientsData]) => {
      setJobs(jobsData.items || []);
      setMeta(jobsData.meta || { page: p, totalPages: 1, total: 0 });
      setClients(clientsData);
    }).catch(() => null);

  useEffect(() => { load(page); }, [page]);

  const createJob = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await api("/jobs", { method: "POST", body: JSON.stringify(jobForm) });
      setJobForm(EMPTY_JOB); setShowForm(false); load(page);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const addTask = async (jobId) => {
    const body = taskForms[jobId];
    if (!body?.description) return;
    await api(`/jobs/${jobId}/tasks`, { method: "POST", body: JSON.stringify(body) });
    setTaskForms({ ...taskForms, [jobId]: EMPTY_TASK });
    load(page);
  };

  const createReviewLink = async (jobId) => {
    const data = await api(`/jobs/${jobId}/client-review-link`, { method: "POST" });
    setReviewLinks((prev) => ({ ...prev, [jobId]: data.reviewUrl }));
  };

  const updateTaskStatus = async (taskId, status) => {
    await api(`/jobs/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load(page);
  };

  const inputStyle = {
    background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Jobs</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>{meta.total} total job{meta.total !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ New Job"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createJob}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>New Job</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Client *</label>
              <select style={inputStyle} required value={jobForm.clientId}
                onChange={(e) => setJobForm({ ...jobForm, clientId: e.target.value })}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Job Title *</label>
              <input style={inputStyle} required placeholder="Brand Campaign" value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Owner</label>
              <input style={inputStyle} placeholder="Name" value={jobForm.owner}
                onChange={(e) => setJobForm({ ...jobForm, owner: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Due Date</label>
              <input style={inputStyle} type="date" value={jobForm.dueDate}
                onChange={(e) => setJobForm({ ...jobForm, dueDate: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={jobForm.priority}
                onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          {error && <div style={{ fontSize: 13, color: t.red, background: "rgba(248,113,113,0.1)", borderRadius: 7, padding: "8px 12px" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => { setShowForm(false); setJobForm(EMPTY_JOB); setError(""); }}
              style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 18px", color: t.text2, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Creating…" : "Create Job"}
            </button>
          </div>
        </form>
      )}

      {/* Jobs list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs.map((job) => {
          const taskCount = job.tasks?.length || 0;
          const doneCount = job.tasks?.filter((t) => t.status === "DONE").length || 0;
          const pct = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;
          const isExpanded = expandedJob === job.id;

          return (
            <div key={job.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: t.text3, fontFamily: "var(--font-mono),monospace" }}>{job.id?.slice(0, 8)}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>{job.title}</span>
                    <StatusBadge status={job.status} t={t} />
                  </div>
                  <div style={{ fontSize: 12, color: t.text2, marginBottom: 8 }}>{job.client?.name || "—"} {job.owner ? `· ${job.owner}` : ""} {job.dueDate ? `· Due ${new Date(job.dueDate).toLocaleDateString()}` : ""}</div>
                  <ProgressBar value={pct} color={t.accent} t={t} />
                </div>
                <div style={{ fontSize: 12, color: t.text3, whiteSpace: "nowrap" }}>{doneCount}/{taskCount} tasks</div>
                <div style={{ fontSize: 11, color: t.text3, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: `1px solid ${t.border}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Tasks */}
                  {job.tasks?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Tasks</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {job.tasks.map((task) => (
                          <div key={task.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px" }}>
                            <span style={{ fontSize: 13, color: t.text1 }}>{task.description}</span>
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              style={{
                                background: t.contentBg,
                                border: `1px solid ${t.border}`,
                                borderRadius: 6,
                                padding: "4px 8px",
                                color: t.text2,
                                fontSize: 12,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              <option value="TODO">TODO</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="DONE">DONE</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add task */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 2 }} placeholder="Task description"
                      value={taskForms[job.id]?.description || ""}
                      onChange={(e) => setTaskForms({ ...taskForms, [job.id]: { ...(taskForms[job.id] || EMPTY_TASK), description: e.target.value } })} />
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Assign to"
                      value={taskForms[job.id]?.assignedTo || ""}
                      onChange={(e) => setTaskForms({ ...taskForms, [job.id]: { ...(taskForms[job.id] || EMPTY_TASK), assignedTo: e.target.value } })} />
                    <button onClick={() => addTask(job.id)}
                      style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                      + Task
                    </button>
                  </div>

                  {/* Client review link */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={() => createReviewLink(job.id)}
                      style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", color: t.text2, fontSize: 12, cursor: "pointer" }}>
                      Generate Client Review Link
                    </button>
                    {reviewLinks[job.id] && (
                      <span style={{ fontSize: 12, color: t.accent, fontFamily: "var(--font-mono),monospace", wordBreak: "break-all" }}>
                        {reviewLinks[job.id]}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {jobs.length === 0 && (
          <div style={{ textAlign: "center", color: t.text3, fontSize: 13, padding: 40 }}>No jobs yet.</div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: t.text2 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1, color: t.text2 }}>← Prev</button>
          <span>Page {meta.page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
            style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", cursor: page >= meta.totalPages ? "not-allowed" : "pointer", opacity: page >= meta.totalPages ? 0.4 : 1, color: t.text2 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

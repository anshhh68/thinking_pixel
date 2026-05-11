"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { StatusBadge, Badge } from "../../components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export default function CreativePage() {
  const { t } = useTheme();
  const [jobs, setJobs] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => api("/jobs?paginated=true&page=1&pageSize=50").then((r) => setJobs(r?.items || [])).catch(() => null);
  useEffect(() => { load(); }, []);

  const user = (() => { try { return JSON.parse(localStorage.getItem("tp_user") || "{}"); } catch { return {}; } })();
  const allTasks = jobs
    .flatMap((j) => (j.tasks || []).map((t) => ({ ...t, jobTitle: j.title })))
    .filter((task) => user.role !== "STAFF" || task.assignedTo === user.name);
  const selectedTaskObj = allTasks.find((t) => t.id === selectedTask);

  const upload = async () => {
    if (!selectedTask || !file) return;
    setUploading(true);
    const token = localStorage.getItem("tp_token");
    const fd = new FormData();
    fd.append("file", file);
    try {
      await fetch(`${API_BASE}/creative/tasks/${selectedTask}/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      setFile(null);
      load();
    } finally { setUploading(false); }
  };

  const markReady = async () => {
    if (!selectedTask) return;
    await api(`/jobs/tasks/${selectedTask}/ready`, { method: "PATCH" });
    load();
  };

  const inputStyle = { background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.text1, fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Creative Studio</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>Upload asset versions and mark tasks ready for review</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Upload panel */}
        <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Upload Asset Version</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Task</label>
            <select style={inputStyle} value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
              <option value="">— Choose task —</option>
              {allTasks.map((task) => (
                <option key={task.id} value={task.id}>{task.jobTitle} — {task.description}</option>
              ))}
            </select>
          </div>
          <div style={{ border: `2px dashed ${t.border}`, borderRadius: 10, padding: "24px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: t.text3, marginBottom: 10 }}>Drag creative files or browse</div>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ fontSize: 13, color: t.text2 }} />
            {file && <div style={{ fontSize: 12, color: t.emerald, marginTop: 8 }}>✓ {file.name}</div>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={upload} disabled={!selectedTask || !file || uploading}
              style={{ flex: 1, background: t.accent, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (!selectedTask || !file || uploading) ? "not-allowed" : "pointer", opacity: (!selectedTask || !file || uploading) ? 0.5 : 1 }}>
              {uploading ? "Uploading…" : "Upload Version"}
            </button>
            <button onClick={markReady} disabled={!selectedTask}
              style={{ flex: 1, background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px", color: t.text2, fontSize: 13, cursor: !selectedTask ? "not-allowed" : "pointer", opacity: !selectedTask ? 0.5 : 1 }}>
              Mark Ready
            </button>
          </div>
        </div>

        {/* Version timeline */}
        <div style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 16 }}>Version Timeline</div>
          {!selectedTaskObj && <div style={{ color: t.text3, fontSize: 13 }}>Select a task to view versions</div>}
          {selectedTaskObj && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text1 }}>{selectedTaskObj.description}</div>
                <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>{selectedTaskObj.jobTitle}</div>
                <div style={{ marginTop: 6 }}><StatusBadge status={selectedTaskObj.status} t={t} /></div>
              </div>
              {(selectedTaskObj.versions || []).length === 0 && (
                <div style={{ fontSize: 13, color: t.text3 }}>No versions uploaded yet</div>
              )}
              {(selectedTaskObj.versions || []).map((v) => (
                <div key={v.id} style={{ background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge label={`v${v.versionNumber}`} color={t.indigo} soft={t.indigoSoft} />
                  {v.fileUrl?.startsWith("data:image/") ? (
                    <img src={v.fileUrl} alt={`v${v.versionNumber}`} style={{ maxHeight: 48, maxWidth: 120, borderRadius: 4, objectFit: "cover" }} />
                  ) : (
                    <a href={v.fileUrl} download target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.accent }}>Download</a>
                  )}
                  <span style={{ fontSize: 11, color: t.text3 }}>{new Date(v.uploadedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task list */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1, marginBottom: 14 }}>All Tasks</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {allTasks.map((task) => (
            <div key={task.id} onClick={() => setSelectedTask(task.id)}
              style={{ background: selectedTask === task.id ? t.accentSoft : t.surfaceBg, border: `1px solid ${selectedTask === task.id ? t.accent + "60" : t.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ fontSize: 12, color: t.accent, marginBottom: 4 }}>{task.jobTitle}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.text1, marginBottom: 8 }}>{task.description}</div>
              <StatusBadge status={task.status} t={t} />
            </div>
          ))}
          {allTasks.length === 0 && <div style={{ color: t.text3, fontSize: 13 }}>No tasks found</div>}
        </div>
      </div>
    </div>
  );
}

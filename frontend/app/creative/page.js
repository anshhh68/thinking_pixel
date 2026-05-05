"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Badge from "../../components/Badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export default function CreativePage() {
  const [jobs, setJobs] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [file, setFile] = useState(null);

  const load = async () => {
    const data = await api("/jobs");
    setJobs(data);
  };

  useEffect(() => {
    load();
  }, []);

  const allTasks = jobs.flatMap((j) => (j.tasks || []).map((t) => ({ ...t, jobTitle: j.title })));

  const upload = async () => {
    if (!selectedTask || !file) return;
    const token = localStorage.getItem("tp_token");
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`${API_BASE}/creative/tasks/${selectedTask}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    setFile(null);
    load();
  };

  const markReady = async () => {
    if (!selectedTask) return;
    await api(`/jobs/tasks/${selectedTask}/ready`, { method: "PATCH" });
    load();
  };

  const selectedTaskObj = allTasks.find((t) => t.id === selectedTask);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 16 }}>
        <h1 style={{ fontSize: 50 }}>Studio Assets</h1>
        <p className="text-muted">Upload versions, prepare creative deliverables, and send to review.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="panel" style={{ padding: 14, display: "grid", gap: 8 }}>
          <h3>Select Task</h3>
          <select className="select" value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
            <option value="">Select task</option>
            {allTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.jobTitle} - {t.description}
              </option>
            ))}
          </select>
          <div
            className="panel"
            style={{
              padding: 24,
              textAlign: "center",
              borderStyle: "dashed",
              borderWidth: 1,
            }}
          >
            <p className="text-muted" style={{ marginBottom: 8 }}>
              Drag and drop creative files or choose manually.
            </p>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" type="button" onClick={upload}>
              Upload Version
            </button>
            <button className="btn-outline" type="button" onClick={markReady}>
              Mark Ready
            </button>
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <h3>Version Timeline</h3>
          {!selectedTaskObj && <p className="text-muted" style={{ marginTop: 8 }}>Select a task to view versions.</p>}
          {!!selectedTaskObj && (
            <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
              {(selectedTaskObj.versions || []).map((v) => (
                <div key={v.id} className="panel" style={{ padding: 10, display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <Badge tone="secondary">v{v.versionNumber}</Badge>
                  </span>
                  <span className="text-muted" style={{ marginLeft: 8 }}>
                    {v.fileUrl}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

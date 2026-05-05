"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import Badge from "../../../components/Badge";

export default function HodApprovalQueuePage() {
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState({});
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api("/jobs/hod/queue");
      setItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (taskId, status) => {
    await api(`/jobs/tasks/${taskId}/hod-decision`, {
      method: "PATCH",
      body: JSON.stringify({ status, comment: comments[taskId] || "" }),
    });
    load();
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 16 }}>
        <h1 style={{ fontSize: 48 }}>Studio Approval Queue</h1>
        <p className="text-muted">Review ready assets and route them to client handoff or rework.</p>
      </section>
      {!!error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {items.length === 0 && <p className="text-muted">No pending tasks in queue.</p>}
      <div className="card-grid" style={{ gridTemplateColumns: "repeat(2, minmax(280px, 1fr))" }}>
        {items.map((task) => (
          <div key={task.id} className="panel" style={{ padding: 12, display: "grid", gap: 8 }}>
            <div
              style={{
                height: 140,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background:
                  "radial-gradient(circle at top right, rgba(217,0,255,0.2), transparent 45%), radial-gradient(circle at bottom left, rgba(242,109,43,0.2), transparent 50%), #111",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{task.job?.title}</strong>
              <Badge tone="secondary">{task.versions?.[0] ? `v${task.versions[0].versionNumber}` : "No version"}</Badge>
            </div>
            <p className="text-muted">{task.description}</p>
            <p className="text-muted" style={{ fontSize: 12 }}>
              Client: {task.job?.client?.name} | Assigned: {task.assignedTo || "N/A"}
            </p>
            <textarea
              className="textarea"
              placeholder="Comment for approval/rejection"
              value={comments[task.id] || ""}
              onChange={(e) => setComments((prev) => ({ ...prev, [task.id]: e.target.value }))}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" type="button" onClick={() => decide(task.id, "APPROVED")}>
                Approve
              </button>
              <button className="btn-outline" type="button" onClick={() => decide(task.id, "REJECTED")}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

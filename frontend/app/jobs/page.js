"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Badge from "../../components/Badge";
import JobCard from "../../components/JobCard";

const emptyJob = { clientId: "", title: "", owner: "", dueDate: "", priority: "MEDIUM" };
const emptyTask = { assignedTo: "", description: "", dueDate: "" };

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [taskForms, setTaskForms] = useState({});
  const [reviewLinks, setReviewLinks] = useState({});

  const load = async (targetPage = page) => {
    const [jobsData, clientsData] = await Promise.all([
      api(`/jobs?paginated=true&page=${targetPage}&pageSize=10`),
      api("/clients"),
    ]);
    setJobs(jobsData.items || []);
    setMeta(jobsData.meta || { page: targetPage, totalPages: 1, total: 0 });
    setClients(clientsData);
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const createJob = async (e) => {
    e.preventDefault();
    await api("/jobs", { method: "POST", body: JSON.stringify(jobForm) });
    setJobForm(emptyJob);
    load(page);
  };

  const addTask = async (jobId) => {
    const body = taskForms[jobId];
    await api(`/jobs/${jobId}/tasks`, { method: "POST", body: JSON.stringify(body) });
    setTaskForms({ ...taskForms, [jobId]: emptyTask });
    load(page);
  };

  const createClientReviewLink = async (jobId) => {
    const data = await api(`/jobs/${jobId}/client-review-link`, { method: "POST" });
    setReviewLinks((prev) => ({ ...prev, [jobId]: data.reviewUrl }));
  };

  const groups = {
    Pipeline: [],
    Creative: [],
    Review: [],
  };
  jobs.forEach((job) => {
    const taskList = job.tasks || [];
    const doneCount = taskList.filter((t) => t.status === "DONE").length;
    const pct = taskList.length ? Math.round((doneCount / taskList.length) * 100) : 0;
    const status = (job.status || "").toUpperCase();
    const item = {
      id: job.id,
      title: job.title,
      status: job.status,
      client: job.client?.name,
      description: taskList[0]?.description || "No task brief yet",
      progress: pct,
    };
    if (status.includes("REVIEW")) groups.Review.push(item);
    else if (status.includes("OPEN") || status.includes("TODO")) groups.Pipeline.push(item);
    else groups.Creative.push(item);
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section className="panel" style={{ padding: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 46 }}>Active Jobs</h2>
          <Badge tone="primary">{meta.total} Total</Badge>
        </div>
        <form
          onSubmit={createJob}
          style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", gap: 8 }}
        >
          <select
            className="select"
            required
            value={jobForm.clientId}
            onChange={(e) => setJobForm({ ...jobForm, clientId: e.target.value })}
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="field"
            required
            placeholder="Job title"
            value={jobForm.title}
            onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
          />
          <input
            className="field"
            placeholder="Owner"
            value={jobForm.owner}
            onChange={(e) => setJobForm({ ...jobForm, owner: e.target.value })}
          />
          <button className="btn-primary" type="submit">
            + Create
          </button>
        </form>
      </section>

      <section style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="btn-outline" type="button" disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span className="text-muted">
          Page {meta.page} / {meta.totalPages}
        </span>
        <button
          className="btn-outline"
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(250px, 1fr))", gap: 14 }}>
        {Object.entries(groups).map(([status, items]) => (
          <div key={status} className="panel" style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ fontSize: 24 }}>{status}</h3>
              <Badge tone={status === "Pipeline" ? "primary" : status === "Creative" ? "secondary" : "tertiary"}>
                {items.length} Tasks
              </Badge>
            </div>
            <div className="card-grid">
              {items.map((job) => (
                <div key={job.id} style={{ display: "grid", gap: 8 }}>
                  <JobCard
                    title={job.title}
                    client={job.client}
                    description={job.description}
                    status={job.status}
                    progress={job.progress}
                    tone={status === "Pipeline" ? "primary" : status === "Creative" ? "secondary" : "tertiary"}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-outline" type="button" onClick={() => createClientReviewLink(job.id)}>
                      Client Link
                    </button>
                    <button className="btn-outline" type="button" onClick={() => addTask(job.id)}>
                      + Task
                    </button>
                  </div>
                  <input
                    className="field"
                    placeholder="Task description"
                    value={taskForms[job.id]?.description || ""}
                    onChange={(e) =>
                      setTaskForms({
                        ...taskForms,
                        [job.id]: { ...(taskForms[job.id] || emptyTask), description: e.target.value },
                      })
                    }
                  />
                  <input
                    className="field"
                    placeholder="Assigned to"
                    value={taskForms[job.id]?.assignedTo || ""}
                    onChange={(e) =>
                      setTaskForms({
                        ...taskForms,
                        [job.id]: { ...(taskForms[job.id] || emptyTask), assignedTo: e.target.value },
                      })
                    }
                  />
                  {reviewLinks[job.id] && (
                    <p className="text-muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
                      {reviewLinks[job.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

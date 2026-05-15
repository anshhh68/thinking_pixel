"use client";
import { Fragment, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";

function StaffTaskList({ tasks, t }) {
  const byJob = tasks.reduce((acc, tk) => {
    const key = tk.job?.title || "Unknown Job";
    if (!acc[key]) acc[key] = [];
    acc[key].push(tk);
    return acc;
  }, {});

  if (tasks.length === 0) return <div style={{ fontSize: 12, color: t.text3, padding: "6px 0" }}>No active tasks.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Object.entries(byJob).map(([jobTitle, jobTasks]) => (
        <div key={jobTitle}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text2, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.accent, display: "inline-block" }} />
            {jobTitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {jobTasks.map((tk) => (
              <div key={tk.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: t.contentBg, borderRadius: 7, gap: 10 }}>
                <span style={{ fontSize: 12, color: t.text1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.description}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {tk.dueDate && <span style={{ fontSize: 11, color: t.text3 }}>{new Date(tk.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                  <StatusPill status={tk.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_COLOR = {
  TODO:        { color: "#F59E0B", label: "To-do" },
  IN_PROGRESS: { color: "#7C7FF5", label: "In Progress" },
  DONE:        { color: "#10B981", label: "Done" },
};

function StatusPill({ status }) {
  const s = STATUS_COLOR[status] || { color: "#9CA3AF", label: status };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "20", borderRadius: 5, padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {s.label}
    </span>
  );
}

export default function TaskPanel({ user }) {
  const { t } = useTheme();
  const isStaff = user?.role === "STAFF";
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [taskCache, setTaskCache] = useState({});
  const [loadingStaff, setLoadingStaff] = useState({});

  useEffect(() => {
    if (!user) return;
    const url = isStaff
      ? `/jobsheet?staffName=${encodeURIComponent(user.name)}`
      : `/jobsheet/workload`;
    api(url).then(setData).catch(() => null);
  }, [user, isStaff]);

  const toggleRow = async (staffName) => {
    if (expanded === staffName) { setExpanded(null); return; }
    setExpanded(staffName);
    if (!taskCache[staffName]) {
      setLoadingStaff((s) => ({ ...s, [staffName]: true }));
      try {
        const tasks = await api(`/jobsheet?staffName=${encodeURIComponent(staffName)}`);
        setTaskCache((c) => ({ ...c, [staffName]: tasks || [] }));
      } catch (_) { setTaskCache((c) => ({ ...c, [staffName]: [] })); }
      setLoadingStaff((s) => ({ ...s, [staffName]: false }));
    }
  };

  const cardStyle = {
    background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14,
    padding: 20, display: "flex", flexDirection: "column", gap: 12,
  };

  if (!data) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>{isStaff ? "My Tasks" : "Team Workload"}</div>
        <div style={{ fontSize: 13, color: t.text3 }}>Loading…</div>
      </div>
    );
  }

  if (isStaff) {
    const tasks = data;
    // Group by job title
    const byJob = tasks.reduce((acc, tk) => {
      const key = tk.job?.title || "Unknown Job";
      if (!acc[key]) acc[key] = [];
      acc[key].push(tk);
      return acc;
    }, {});

    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>My Tasks</div>
          <span style={{ fontSize: 12, color: t.text3 }}>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        </div>

        {tasks.length === 0 ? (
          <div style={{ fontSize: 13, color: t.text3 }}>No tasks assigned to you yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(byJob).map(([jobTitle, jobTasks]) => (
              <div key={jobTitle}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, display: "inline-block" }} />
                  {jobTitle}
                  <span style={{ color: t.text3, fontWeight: 400 }}>({jobTasks.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {jobTasks.map((tk) => (
                    <div key={tk.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: t.contentBg, borderRadius: 8, gap: 10 }}>
                      <span style={{ fontSize: 13, color: t.text1, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.description}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {tk.dueDate && (
                          <span style={{ fontSize: 11, color: t.text3 }}>
                            {new Date(tk.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <StatusPill status={tk.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // HOD / ADMIN — Team Workload table with expandable rows
  const rows = data;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>Team Workload</div>
        <span style={{ fontSize: 12, color: t.text3 }}>{rows.length} staff member{rows.length !== 1 ? "s" : ""}</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: t.text3 }}>No active tasks in the team.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Staff Member", "To-do", "In Progress", "Done (7d)", "Total"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total > 0 ? Math.round((r.IN_PROGRESS / r.total) * 100) : 0;
                const isExpanded = expanded === r.staffName;
                return (
                  <Fragment key={r.staffName}>
                    <tr
                      onClick={() => toggleRow(r.staffName)}
                      style={{ borderBottom: isExpanded ? "none" : `1px solid ${t.border}`, cursor: "pointer", background: isExpanded ? t.accentSoft : "transparent" }}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = t.border + "40"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isExpanded ? t.accentSoft : "transparent"; }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: t.text1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: t.text3, transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                            {r.staffName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          {r.staffName}
                        </div>
                      </td>
                      <td style={{ padding: "9px 12px", color: "#F59E0B", fontWeight: 600 }}>{r.TODO || 0}</td>
                      <td style={{ padding: "9px 12px", color: "#7C7FF5", fontWeight: 600 }}>{r.IN_PROGRESS || 0}</td>
                      <td style={{ padding: "9px 12px", color: "#10B981", fontWeight: 600 }}>{r.DONE || 0}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, color: t.text1 }}>{r.total}</span>
                          <div style={{ flex: 1, height: 4, background: t.border, borderRadius: 2, minWidth: 60 }}>
                            <div style={{ height: "100%", borderRadius: 2, background: "#7C7FF5", width: `${pct}%`, transition: "width 0.3s" }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td colSpan={5} style={{ padding: "10px 16px 14px 56px", background: t.accentSoft }}>
                          {loadingStaff[r.staffName] ? (
                            <div style={{ fontSize: 12, color: t.text3 }}>Loading tasks…</div>
                          ) : (
                            <StaffTaskList tasks={taskCache[r.staffName] || []} t={t} />
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

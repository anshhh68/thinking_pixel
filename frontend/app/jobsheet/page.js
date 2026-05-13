"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { useIsMobile } from "../../lib/useBreakpoint";

const COPY_STATUS_OPTIONS = ["", "Pending", "In Progress", "Done", "On Hold"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_COLOR = {
  LOW:    "#10B981",
  MEDIUM: "#F59E0B",
  HIGH:   "#EF4444",
  URGENT: "#7C3AED",
};

export default function JobSheetPage() {
  const { t } = useTheme();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ date: "", staffName: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.date) qs.set("date", filters.date);
      if (filters.staffName) qs.set("staffName", filters.staffName);
      const data = await api(`/jobsheet?${qs.toString()}`);
      setTasks(data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  const updateField = async (taskId, field, value) => {
    setSaving((s) => ({ ...s, [taskId]: true }));
    try {
      await api(`/jobsheet/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, [field]: value } : t));
    } catch (_) {}
    setSaving((s) => ({ ...s, [taskId]: false }));
  };

  const inputStyle = {
    background: "transparent", border: "none", borderBottom: `1px solid ${t.border}`,
    color: t.text1, fontSize: 12, padding: "3px 4px", outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  // Group tasks by assignedTo
  const staffGroups = tasks.reduce((acc, task) => {
    const key = task.assignedTo || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const COL_HEADERS = ["Date", "Client", "Job Title", "Qty", "Assigned To", "Deadline", "Copy Status", "Priority", "Brief", "Size", "Status"];

  return (
    <div className="anim-fade" style={{ padding: isMobile ? 14 : 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Job Sheet</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>Daily staff task tracker</div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" value={filters.date}
          onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", color: t.text1, fontSize: 13, outline: "none" }} />
        <input placeholder="Search by staff name…" value={filters.staffName}
          onChange={(e) => setFilters((f) => ({ ...f, staffName: e.target.value }))}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", color: t.text1, fontSize: 13, outline: "none", width: 220 }} />
        {(filters.date || filters.staffName) && (
          <button onClick={() => setFilters({ date: "", staffName: "" })}
            style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 14px", color: t.text2, fontSize: 13, cursor: "pointer" }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: t.text3, fontSize: 13 }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ color: t.text3, fontSize: 13 }}>No tasks found. Tasks appear here when they have a due date or match your filters.</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${t.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: t.surfaceBg }}>
                {COL_HEADERS.map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(staffGroups).map(([staffName, staffTasks], groupIdx) =>
                staffTasks.map((task, i) => {
                  const isFirst = i === 0;
                  const rowBg = groupIdx % 2 === 0 ? t.contentBg : t.surfaceBg;
                  const isSaving = saving[task.id];
                  return (
                    <tr key={task.id} style={{ background: rowBg, opacity: isSaving ? 0.7 : 1 }}>
                      {/* Date */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, color: t.text2, whiteSpace: "nowrap" }}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                      </td>
                      {/* Client */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, color: t.text1, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {task.job?.client?.name || "—"}
                      </td>
                      {/* Job Title */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, color: t.text1 }}>
                        {task.job?.title || "—"}
                        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{task.description}</div>
                      </td>
                      {/* Quantity */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                        <input type="number" min="0" value={task.quantity ?? ""} style={{ ...inputStyle, width: 60 }}
                          onChange={(e) => updateField(task.id, "quantity", e.target.value)} />
                      </td>
                      {/* Assigned To */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, color: t.text1, whiteSpace: "nowrap" }}>
                        {task.assignedTo || "—"}
                      </td>
                      {/* Deadline */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, color: t.text2, whiteSpace: "nowrap" }}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                      </td>
                      {/* Copy Status */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                        <select value={task.copyStatus || ""} style={selectStyle}
                          onChange={(e) => updateField(task.id, "copyStatus", e.target.value)}>
                          {COPY_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                        </select>
                      </td>
                      {/* Priority */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                        <select value={task.job?.priority || ""} style={{ ...selectStyle, color: PRIORITY_COLOR[task.job?.priority] || t.text2 }}
                          disabled>
                          <option value="">{task.job?.priority || "—"}</option>
                        </select>
                      </td>
                      {/* Brief */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, minWidth: 140 }}>
                        <input value={task.brief || ""} style={inputStyle} placeholder="Brief…"
                          onChange={(e) => updateField(task.id, "brief", e.target.value)} />
                      </td>
                      {/* Size */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, minWidth: 100 }}>
                        <input value={task.size || ""} style={inputStyle} placeholder="e.g. A4"
                          onChange={(e) => updateField(task.id, "size", e.target.value)} />
                      </td>
                      {/* Status */}
                      <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
                        <select value={task.status} style={selectStyle}
                          onChange={(e) => updateField(task.id, "status", e.target.value)}>
                          {["TODO", "IN_PROGRESS", "DONE"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

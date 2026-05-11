"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const ACTION_COLORS = {
  CREATE: { color: "#10B981", soft: "rgba(16,185,129,0.13)" },
  UPDATE: { color: "#7C7FF5", soft: "rgba(124,127,245,0.13)" },
  DELETE: { color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  LOGIN:  { color: "#22D3EE", soft: "rgba(34,211,238,0.13)" },
};

export default function AuditPage() {
  const { t } = useTheme();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: "", entityType: "" });

  const load = (p = page, f = filters) => {
    const params = new URLSearchParams({ paginated: "true", page: p, pageSize: 25 });
    if (f.action) params.set("action", f.action);
    if (f.entityType) params.set("entityType", f.entityType);
    return api(`/audit-logs?${params.toString()}`)
      .then((d) => { setLogs(d.items || []); setMeta(d.meta || {}); })
      .catch(() => null);
  };

  useEffect(() => { load(1, filters); setPage(1); }, [filters]);
  useEffect(() => { load(page, filters); }, [page]);

  const inputStyle = { background: t.contentBg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 11px", color: t.text1, fontSize: 13, outline: "none", fontFamily: "inherit" };

  return (
    <div className="anim-fade" style={{ padding: 28, overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Audit Logs</div>
        <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>{meta.total || 0} total entries</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          style={inputStyle}>
          <option value="">All Actions</option>
          <option value="CLIENT_CREATED">CLIENT_CREATED</option>
          <option value="CLIENT_UPDATED">CLIENT_UPDATED</option>
          <option value="CLIENT_DELETED">CLIENT_DELETED</option>
          <option value="JOB_CREATED">JOB_CREATED</option>
          <option value="TASK_CREATED">TASK_CREATED</option>
          <option value="TASK_MARKED_READY">TASK_MARKED_READY</option>
          <option value="HOD_DECISION">HOD_DECISION</option>
          <option value="INVOICE_CREATED">INVOICE_CREATED</option>
          <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
          <option value="NOTIFICATION_BROADCAST">NOTIFICATION_BROADCAST</option>
          <option value="LOGIN">LOGIN</option>
        </select>
        <select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
          style={inputStyle}>
          <option value="">All Entities</option>
          <option value="Client">Client</option>
          <option value="Job">Job</option>
          <option value="Task">Task</option>
          <option value="Invoice">Invoice</option>
          <option value="Notification">Notification</option>
          <option value="User">User</option>
        </select>
        {(filters.action || filters.entityType) && (
          <button onClick={() => setFilters({ action: "", entityType: "" })}
            style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: t.text2, cursor: "pointer" }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {logs.map((log) => {
          const ac = ACTION_COLORS[log.action] || { color: t.text3, soft: t.surfaceBg };
          return (
            <div key={log.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>
                <span style={{ background: ac.soft, color: ac.color, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono),monospace" }}>
                  {log.action}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: t.text1, fontWeight: 500, marginBottom: 2 }}>
                  {log.entity} {log.entityId ? <span style={{ fontSize: 11, color: t.text3, fontFamily: "var(--font-mono),monospace" }}>· {log.entityId?.slice(0, 8)}</span> : null}
                </div>
                {log.details && (
                  <div style={{ fontSize: 12, color: t.text2, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
                    {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                  </div>
                )}
                <div style={{ fontSize: 11, color: t.text3 }}>
                  {log.user?.name || log.userId || "System"} · {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div style={{ textAlign: "center", color: t.text3, padding: 40, fontSize: 13 }}>No audit logs found</div>
        )}
      </div>

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

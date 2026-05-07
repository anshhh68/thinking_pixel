"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { Badge } from "../../components/ui";

const PRIORITY_COLORS = {
  HIGH:   { color: "#F87171", soft: "rgba(248,113,113,0.13)" },
  MEDIUM: { color: "#F59E0B", soft: "rgba(245,158,11,0.13)" },
  LOW:    { color: "#10B981", soft: "rgba(16,185,129,0.13)" },
};

const EMPTY = { name: "", contactInfo: "", requirements: "", scope: "", timeline: "", priority: "MEDIUM" };

export default function ClientsPage() {
  const { t } = useTheme();
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => api("/clients").then(setClients).catch(() => null);
  useEffect(() => { load(); }, []);

  const createClient = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api("/clients", { method: "POST", body: JSON.stringify(form) });
      setForm(EMPTY); setShowForm(false); load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
          <div style={{ fontSize: 22, fontWeight: 700, color: t.text1 }}>Clients</div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 2 }}>{clients.length} client{clients.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createClient}
          style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text1 }}>New Client</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Client Name *</label>
              <input style={inputStyle} required placeholder="Acme Corp" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Contact Info</label>
              <input style={inputStyle} placeholder="email / phone" value={form.contactInfo}
                onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Scope</label>
              <input style={inputStyle} placeholder="Brand identity, web…" value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Timeline</label>
              <input style={inputStyle} placeholder="Q2 2026" value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Requirements</label>
            <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3}
              placeholder="Project brief and requirements…" value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
          </div>

          {error && <div style={{ fontSize: 13, color: t.red, background: "rgba(248,113,113,0.1)", borderRadius: 7, padding: "8px 12px" }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY); setError(""); }}
              style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 18px", color: t.text2, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: t.accent, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Creating…" : "Create Client"}
            </button>
          </div>
        </form>
      )}

      {/* Clients grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {clients.map((client) => {
          const pc = PRIORITY_COLORS[client.priority] || PRIORITY_COLORS.MEDIUM;
          return (
            <div key={client.id} style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text1 }}>{client.name}</div>
                <Badge label={client.priority || "MEDIUM"} color={pc.color} soft={pc.soft} />
              </div>
              {client.contactInfo && (
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 6 }}>{client.contactInfo}</div>
              )}
              {client.scope && (
                <div style={{ fontSize: 12, color: t.text3, marginBottom: 6 }}>Scope: {client.scope}</div>
              )}
              {client.timeline && (
                <div style={{ fontSize: 12, color: t.text3 }}>Timeline: {client.timeline}</div>
              )}
              <div style={{ marginTop: 10, fontSize: 12, color: t.text3 }}>
                {client._count?.jobs ?? 0} job(s)
              </div>
            </div>
          );
        })}
        {clients.length === 0 && (
          <div style={{ color: t.text3, fontSize: 13, gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
            No clients yet. Add your first client.
          </div>
        )}
      </div>
    </div>
  );
}

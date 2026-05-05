"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Badge from "../../components/Badge";

const initialState = {
  name: "",
  contactInfo: "",
  requirements: "",
  scope: "",
  timeline: "",
  priority: "MEDIUM",
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api("/clients");
      setClients(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createClient = async (e) => {
    e.preventDefault();
    await api("/clients", { method: "POST", body: JSON.stringify(form) });
    setForm(initialState);
    load();
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section
        className="panel"
        style={{
          padding: 22,
          background:
            "radial-gradient(circle at right, rgba(242,109,43,0.2), transparent 45%), #131313",
        }}
      >
        <p className="chip" style={{ marginBottom: 10, width: "fit-content" }}>
          ACTIVE CAMPAIGN
        </p>
        <h1 style={{ fontSize: 64, lineHeight: 0.95 }}>Project: Neon Zenith</h1>
        <p className="text-muted" style={{ maxWidth: 700, marginTop: 8 }}>
          Global launch campaign with immersive digital environments and generative identity.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn-primary" type="button">
            VIEW ASSETS
          </button>
          <button className="btn-outline" type="button">
            CLIENT BRIEF
          </button>
        </div>
      </section>

      <section className="panel" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 42, marginBottom: 8 }}>Timeline & Milestones</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <Badge tone="success">Conceptual Discovery - Completed</Badge>
          <Badge tone="secondary">Asset Production - In Progress</Badge>
          <Badge>Final Delivery - Pending</Badge>
        </div>
      </section>

      <section className="panel" style={{ padding: 14 }}>
        <h3 style={{ marginBottom: 10 }}>Create Client</h3>
        <form onSubmit={createClient} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(180px,1fr))", gap: 8 }}>
          <input className="field" required placeholder="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Contact info" value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} />
          <input className="field" placeholder="Scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
          <input className="field" placeholder="Timeline" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
          <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>LOW</option>
            <option>MEDIUM</option>
            <option>HIGH</option>
          </select>
          <button className="btn-primary" type="submit">
            Create
          </button>
          <textarea className="textarea" style={{ gridColumn: "1 / -1" }} placeholder="Requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
        </form>
      </section>

      <section className="card-grid" style={{ gridTemplateColumns: "repeat(3, minmax(220px, 1fr))" }}>
        {clients.map((client) => (
          <article key={client.id} className="panel" style={{ padding: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: 24 }}>{client.name}</h4>
              <Badge tone="primary">{client.priority || "MEDIUM"}</Badge>
            </div>
            <p className="text-muted">{client.contactInfo || "No contact details"}</p>
            <p className="text-muted">{client.scope || "No scope defined"}</p>
          </article>
        ))}
      </section>
      {!!error && <p style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}

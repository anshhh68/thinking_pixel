"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [registerMode, setRegisterMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
  });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (registerMode) {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 420px" }}>
      <section
        className="panel"
        style={{
          margin: 24,
          padding: 36,
          display: "grid",
          alignContent: "center",
          background:
            "radial-gradient(circle at center right, rgba(217,0,255,0.18), transparent 45%), radial-gradient(circle at center left, rgba(242,109,43,0.16), transparent 45%), #121212",
        }}
      >
        <p className="chip" style={{ width: "fit-content", marginBottom: 14 }}>
          SYSTEM ONLINE
        </p>
        <h1 style={{ fontSize: 72, lineHeight: 0.95, maxWidth: 580 }}>
          Welcome back,
          <br />
          <span style={{ color: "var(--primary)" }}>Creative</span>{" "}
          <span style={{ color: "var(--secondary)" }}>Director.</span>
        </h1>
        <p className="text-muted" style={{ marginTop: 18, maxWidth: 520 }}>
          The atelier runs on velocity and craft. Access your command center to manage jobs,
          approvals, talent, and billing.
        </p>
      </section>
      <section style={{ borderLeft: "1px solid var(--border)", padding: 26, display: "grid", alignContent: "center" }}>
        <div className="panel" style={{ padding: 20 }}>
          <h2 style={{ marginBottom: 12 }}>{registerMode ? "Create Account" : "Sign In"}</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            {registerMode && (
              <input
                className="field"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            <input
              className="field"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="field"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {registerMode && (
              <select
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="CLIENT">CLIENT</option>
                <option value="STAFF">STAFF</option>
                <option value="HOD">HOD</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            )}
            <button className="btn-primary" type="submit">
              {registerMode ? "Register + Login" : "Login"}
            </button>
          </form>
          {!!error && <p style={{ color: "var(--danger)", marginTop: 10 }}>{error}</p>}
          <button className="btn-outline" onClick={() => setRegisterMode((v) => !v)} style={{ marginTop: 12 }}>
            {registerMode ? "Switch to Login" : "Switch to Register"}
          </button>
        </div>
      </section>
    </div>
  );
}

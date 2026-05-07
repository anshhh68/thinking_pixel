"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../lib/theme";
import { api } from "../../lib/api";

const DEMOS = [
  { label: "Admin",  email: "admin@thinkingpixel.com",  password: "Admin@123" },
  { label: "HOD",    email: "hod@thinkingpixel.com",    password: "Hod@123" },
  { label: "Staff",  email: "staff@thinkingpixel.com",  password: "Staff@123" },
  { label: "Client", email: "client@thinkingpixel.com", password: "Client@123" },
];

export default function LoginPage() {
  const { t, isDark, toggle } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "10px 14px", color: t.text1, fontSize: 14, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <button onClick={toggle} style={{ position: "fixed", top: 16, right: 16, background: t.border, border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 15, color: t.text2 }}>
        {isDark ? "☀" : "◑"}
      </button>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="7" width="7" height="7" rx="1.5" fill="white" opacity="0.9" />
              <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" />
              <rect x="10" y="10" width="4" height="4" rx="1" fill="white" opacity="0.5" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: t.text1 }}>thinking pixel</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: t.text1, marginBottom: 6 }}>Sign in to IMS</h1>
          <p style={{ fontSize: 14, color: t.text2 }}>Your internal management workspace</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input style={inputStyle} type="email" placeholder="Email address" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input style={inputStyle} type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {error && <div style={{ fontSize: 13, color: t.red, background: t.redSoft, borderRadius: 7, padding: "8px 12px" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ background: t.accent, border: "none", borderRadius: 8, padding: "11px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Quick fill — demo accounts</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DEMOS.map((d) => (
              <button key={d.label} onClick={() => setForm({ email: d.email, password: d.password })}
                style={{ background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 12px", fontSize: 12, color: t.text2, cursor: "pointer" }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

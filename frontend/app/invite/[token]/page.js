"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../lib/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export default function InviteAcceptPage() {
  const { token } = useParams();
  const router = useRouter();
  const { t, isDark, toggle } = useTheme();

  const [step, setStep] = useState("loading"); // loading | form | error | success
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({ name: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/invites/validate/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || "Invalid invite link");
          setStep("error");
          return;
        }
        const data = await res.json();
        setInvite(data);
        setStep("form");
      } catch (_err) {
        setError("Unable to validate invite. Please try again later.");
        setStep("error");
      }
    })();
  }, [token]);

  const rolePretty = (role) =>
    (role || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const submit = async (e) => {
    e.preventDefault();
    setFieldError("");

    if (form.password.length < 6) {
      setFieldError("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirm) {
      setFieldError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/invites/accept/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, password: form.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFieldError(data.message || "Failed to create account");
        return;
      }

      const data = await res.json();
      localStorage.setItem("tp_token", data.token);
      localStorage.setItem("tp_user", JSON.stringify(data.user));
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (_err) {
      setFieldError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    background: t.surfaceBg,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: "10px 14px",
    color: t.text1,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  const Logo = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
      <div
        style={{
          width: 36, height: 36, borderRadius: 9, background: t.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="7" width="7" height="7" rx="1.5" fill="white" opacity="0.9" />
          <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" />
          <rect x="10" y="10" width="4" height="4" rx="1" fill="white" opacity="0.5" />
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: t.text1 }}>thinking pixel</span>
    </div>
  );

  // ── Loading ──
  if (step === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: t.text2 }}>Validating your invite…</div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (step === "error") {
    const isExpired = error.toLowerCase().includes("expired");
    const isUsed = error.toLowerCase().includes("already");

    return (
      <div style={{ minHeight: "100vh", background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <Logo />
          <div style={{
            background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 16, padding: 32,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>
              {isExpired ? "⏰" : isUsed ? "✓" : "⚠"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text1, marginBottom: 8 }}>
              {isExpired ? "Invite Expired" : isUsed ? "Already Used" : "Invalid Link"}
            </div>
            <div style={{ fontSize: 14, color: t.text2, lineHeight: 1.6, marginBottom: 24 }}>
              {error}
            </div>
            {isUsed && (
              <button
                onClick={() => router.push("/login")}
                style={{
                  background: t.accent, border: "none", borderRadius: 8, padding: "11px 24px",
                  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Go to Sign In
              </button>
            )}
            {isExpired && (
              <div style={{ fontSize: 13, color: t.text3 }}>
                Please ask your admin to send a new invitation.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (step === "success") {
    return (
      <div style={{ minHeight: "100vh", background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <Logo />
          <div style={{
            background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 16, padding: 32,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text1, marginBottom: 8 }}>
              Welcome to Thinking Pixel!
            </div>
            <div style={{ fontSize: 14, color: t.text2 }}>
              Your account has been created. Redirecting to dashboard…
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Sign-Up Form ──
  return (
    <div style={{ minHeight: "100vh", background: t.contentBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <button
        onClick={toggle}
        style={{
          position: "fixed", top: 16, right: 16, background: t.border, border: "none",
          borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 15, color: t.text2,
        }}
      >
        {isDark ? "☀" : "◑"}
      </button>

      <div style={{ width: "100%", maxWidth: 420 }}>
        <Logo />

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: t.text1, marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: t.text2, lineHeight: 1.5, margin: 0 }}>
            <strong style={{ color: t.text1 }}>{invite.inviterName}</strong> invited you to join
            Thinking Pixel IMS
          </p>
        </div>

        {/* Invite info card */}
        <div style={{
          background: t.surfaceBg, border: `1px solid ${t.border}`, borderRadius: 12,
          padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            background: `${t.accent}18`, border: `1px solid ${t.accent}30`, borderRadius: 8,
            padding: "6px 12px", fontSize: 12, fontWeight: 600, color: t.accent,
          }}>
            {rolePretty(invite.role)}
          </div>
          <div style={{ fontSize: 13, color: t.text2 }}>{invite.email}</div>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: t.text2, display: "block", marginBottom: 4 }}>
              Email
            </label>
            <input
              style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
              type="email"
              value={invite.email}
              disabled
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: t.text2, display: "block", marginBottom: 4 }}>
              Full Name
            </label>
            <input
              style={inputStyle}
              type="text"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: t.text2, display: "block", marginBottom: 4 }}>
              Password
            </label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: t.text2, display: "block", marginBottom: 4 }}>
              Confirm Password
            </label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Re-enter your password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </div>

          {fieldError && (
            <div style={{
              fontSize: 13, color: t.red, background: t.redSoft || "#F8717115",
              borderRadius: 7, padding: "8px 12px",
            }}>
              {fieldError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: t.accent, border: "none", borderRadius: 8, padding: "12px",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1, marginTop: 4,
            }}
          >
            {submitting ? "Creating account…" : "Create Account & Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 13, color: t.text3 }}>Already have an account? </span>
          <a
            href="/login"
            style={{ fontSize: 13, color: t.accent, textDecoration: "none", fontWeight: 500 }}
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

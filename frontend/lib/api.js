const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";

export async function api(path, options = {}) {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("tp_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }
  return response.status === 204 ? null : response.json();
}

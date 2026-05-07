export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("tp_user");
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("tp_user");
  window.localStorage.removeItem("tp_token");
}

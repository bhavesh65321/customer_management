/**
 * parseApiError — extract the most meaningful error message from any API response body.
 *
 * Backend sends responses in two shapes:
 *   Shape A (FastAPI validation):  { detail: [{msg, loc}] | "string" }
 *   Shape B (our custom wrapper):  { success: false, error: { code, message } }
 *
 * Falls back to the provided `fallback` string if nothing useful is found.
 */
export function parseApiError(data, fallback = "Something went wrong. Please try again.") {
  if (!data) return fallback;

  // Shape A — FastAPI validation list
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => d.msg || d.message || String(d)).join(", ");
  }

  // Shape B — our error wrapper
  const raw =
    data.detail ||
    data.error?.message ||
    data.message ||
    "";

  return raw.trim() || fallback;
}

/**
 * friendlyAuthError — converts raw auth error messages into user-friendly ones.
 */
export function friendlyAuthError(raw) {
  const l = raw.toLowerCase();
  if (l.includes("invalid credentials") || l.includes("unauthorized") || l.includes("incorrect password") || l.includes("wrong password"))
    return "Incorrect email or password. Please try again.";
  if (l.includes("not found") || l.includes("no account") || l.includes("no user"))
    return "No account found with this email address.";
  if (l.includes("disabled") || l.includes("deactivated") || l.includes("suspended"))
    return "Your account has been disabled. Please contact support.";
  if (l.includes("already exists") || l.includes("already registered") || l.includes("duplicate"))
    return "An account with this email already exists. Try logging in.";
  if (l.includes("invalid email") || l.includes("email format"))
    return "Please enter a valid email address.";
  if (l.includes("weak password") || l.includes("password too short"))
    return "Password is too weak. Use at least 8 characters with letters and numbers.";
  if (l.includes("token") && (l.includes("expired") || l.includes("invalid")))
    return "This link has expired or is invalid. Please request a new one.";
  if (l.includes("network") || l.includes("fetch") || l.includes("connection"))
    return "Network error. Please check your connection and try again.";
  return raw; // already a good message
}

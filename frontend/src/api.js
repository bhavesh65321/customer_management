const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// Lazy import to avoid circular deps — toast is only called at runtime
function showErrorToast(msg) {
  try {
    // react-hot-toast is a singleton; safe to import anywhere
    const { default: toast } = require("react-hot-toast");
    toast.error(msg, { duration: 4500 });
  } catch {
    // If toast is not available (e.g., during SSR tests) just console
    console.error("[API Error]", msg);
  }
}

function getToken() {
  return localStorage.getItem("token");
}

function clearTokenAndRedirectToLogin() {
  localStorage.removeItem("token");
  const isCustomerPortal = window.location.pathname.startsWith("/customer");
  window.location.href = isCustomerPortal ? "/customer/login" : "/login";
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function authHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function authHeadersMultipart() {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  if (res.status === 401) {
    clearTokenAndRedirectToLogin();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = err.detail || err.message || "Request failed";
    // Auto-surface server errors (5xx) as toast notifications so users
    // always know when something went wrong, even on silent background calls
    if (res.status >= 500) {
      showErrorToast("Server error. Please try again shortly.");
    } else if (res.status === 422) {
      showErrorToast("Validation error: " + msg);
    } else if (res.status === 403) {
      showErrorToast("You don't have permission to perform this action.");
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function apiGet(url) {
  const res = await fetch(`${API_BASE}${url}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiPost(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiPut(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiPatch(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export { getToken, parseJwt, API_BASE, authHeaders, authHeadersMultipart };

// ── Default axios-style export for new components ────────────────────────────
// Provides api.get(url, {params}), api.post(url, body), api.patch(url, body)
// Returns { data } to match axios conventions used in new pages/components.
async function _req(method, url, { body, params } = {}) {
  let fullUrl = `${API_BASE}/api${url}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    if (qs) fullUrl += `?${qs}`;
  }
  const res = await fetch(fullUrl, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.detail?.message || data?.detail || "Request failed");
    err.response = { status: res.status, data };
    throw err;
  }
  return { data };
}

const api = {
  get:    (url, opts)  => _req("GET",    url, opts),
  post:   (url, body)  => _req("POST",   url, { body }),
  put:    (url, body)  => _req("PUT",    url, { body }),
  patch:  (url, body)  => _req("PATCH",  url, { body }),
  delete: (url)        => _req("DELETE", url),
};

export default api;

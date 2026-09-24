/**
 * EMM Dashboard — API Service Layer
 * ──────────────────────────────────
 * Centralised HTTP client for communicating with the FastAPI backend.
 *
 * Auth model:
 *   • Manager endpoints use JWT Bearer tokens (obtained via /auth/login)
 *   • The master API key is NEVER sent from the browser
 *   • Android devices use per-device API keys (not handled here)
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ── Token Storage ────────────────────────────────────────────

const TOKEN_KEY = 'emm_access_token';
const MANAGER_KEY = 'emm_manager';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredManager() {
  const raw = localStorage.getItem(MANAGER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeAuth(token, manager) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(MANAGER_KEY, JSON.stringify(manager));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MANAGER_KEY);
}

export function isAuthenticated() {
  return !!getStoredToken();
}

// ── HTTP Client ──────────────────────────────────────────────

/** Build headers with JWT Bearer auth */
function authHeaders() {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Generic fetch wrapper with error handling */
async function request(method, path, body = null) {
  const opts = { method, headers: authHeaders() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  // Handle 401 — token expired or invalid
  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event('emm:auth-expired'));
    throw new Error('Session expired — please log in again');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || `HTTP ${res.status}`);
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────

/** Log in with username + password → returns JWT + manager profile */
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || 'Login failed');

  storeAuth(data.access_token, data.manager);
  return data;
}

/** Get current manager profile from JWT */
export function getMe() {
  return request('GET', '/auth/me');
}

/** Logout — clear stored credentials */
export function logout() {
  clearAuth();
}

// ── Devices ──────────────────────────────────────────────────

/** List all registered devices */
export function listDevices() {
  return request('GET', '/devices');
}

/** Get a single device's info */
export function getDevice(deviceId) {
  return request('GET', `/devices/${deviceId}`);
}

// ── Events / Logs ────────────────────────────────────────────

/** Fetch recent events (SMS + calls) for a device */
export function getDeviceEvents(deviceId, { limit = 50, eventType } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (eventType) params.set('event_type', eventType);
  return request('GET', `/webhook/events/${deviceId}?${params}`);
}

/** Get event statistics for a device */
export function getDeviceStats(deviceId) {
  return request('GET', `/webhook/stats/${deviceId}`);
}

// ── Commands ─────────────────────────────────────────────────

/** Execute a remote command on a device (e.g. send_sms) */
export function executeCommand(deviceId, commandType, payload = null) {
  return request('POST', '/commands/execute', {
    device_id: deviceId,
    command_type: commandType,
    payload,
  });
}

/** List commands for a device, optionally filtered by status */
export function listDeviceCommands(deviceId, statusFilter = null) {
  const params = statusFilter ? `?status=${statusFilter}` : '';
  return request('GET', `/commands/${deviceId}${params}`);
}

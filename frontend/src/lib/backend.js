// Resolves which backend URL to use for REST + WebSocket.
// The default (no query param) uses the local backend from REACT_APP_BACKEND_URL.
// The codename "cloud" maps to the shared cloud instance.
// Future codenames can be added here without touching components.

export const CLOUD_BACKEND_URL = 'https://alentribes-api-972555331636.europe-southwest1.run.app';
export const LOCAL_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const BACKENDS = {
  cloud: CLOUD_BACKEND_URL,
};

/**
 * Returns the backend URL for the given codename.
 * - `null` / `undefined` / unknown codenames → local backend.
 * - `"cloud"` → CLOUD_BACKEND_URL.
 */
export function resolveBackendUrl(apiParam) {
  if (apiParam && BACKENDS[apiParam]) return BACKENDS[apiParam];
  return LOCAL_BACKEND_URL;
}

export function apiParamLabel(apiParam) {
  if (apiParam === 'cloud') return 'Cloud';
  return 'Local';
}

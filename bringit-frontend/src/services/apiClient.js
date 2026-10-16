/**
 * HTTP client untuk REST API BRINGIT (SRS 3.4, NFR-05).
 *
 * - Semua request memakai JSON dan header `Authorization: Bearer <JWT>`.
 * - Bila VITE_USE_MOCK=true, request dialihkan ke mock API di browser
 *   (src/services/mock) agar frontend bisa dijalankan tanpa backend.
 * - Respons error diseragamkan menjadi ApiError { status, message, errors }.
 */
const ENV = import.meta.env || {};
const BASE_URL = (ENV.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const USE_MOCK = String(ENV.VITE_USE_MOCK ?? 'true') === 'true';

const TOKEN_KEY = 'bringit.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token, remember = true) => {
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch {
      /* storage tidak tersedia */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* abaikan */
    }
  },
};

export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let onUnauthorized = () => {};
/** Dipanggil AuthContext agar sesi dibersihkan saat token kedaluwarsa (401). */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const toQuery = (params) => {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

async function request(method, path, { body, params } = {}) {
  const url = `${path}${toQuery(params)}`;
  const token = tokenStore.get();

  if (USE_MOCK) {
    const { mockRequest } = await import('./mock/router.js');
    try {
      return await mockRequest(method, url, body, token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
      throw e;
    }
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, data?.message || 'Terjadi kesalahan pada server.', data?.errors || {});
  }
  // Mendukung format { data: ... } maupun objek langsung.
  return data && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
};

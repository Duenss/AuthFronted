// Caché del API URL — se computa una sola vez para evitar re-evaluar en cada request
let _cachedApiUrl: string | null = null;

function getApiUrl(): string {
  if (_cachedApiUrl) return _cachedApiUrl;
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    _cachedApiUrl = configuredUrl.replace(/\/+$/, '');
    return _cachedApiUrl;
  }
  if (typeof window !== 'undefined') {
    _cachedApiUrl = `${window.location.origin}/api`;
    return _cachedApiUrl;
  }
  _cachedApiUrl = 'https://authrd-api.up.railway.app/api';
  return _cachedApiUrl;
}

type ApiOptions = RequestInit & { token?: string | null };

export type ApiResult<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers,
      cache: 'no-store'
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Verifica que el backend esté encendido.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }
  return (payload.data ?? payload) as T;
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authrd_token") || sessionStorage.getItem("authrd_token");
}

export function setStoredToken(token: string, remember: boolean) {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem("authrd_token", token);
    sessionStorage.removeItem("authrd_token");
  } else {
    sessionStorage.setItem("authrd_token", token);
    localStorage.removeItem("authrd_token");
  }
}

export function clearStoredToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authrd_token");
  sessionStorage.removeItem("authrd_token");
}

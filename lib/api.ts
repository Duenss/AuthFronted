function getApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }

  return 'https://auchrd.netlify.app/api';
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

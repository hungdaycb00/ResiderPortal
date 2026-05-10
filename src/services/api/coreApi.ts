/**
 * Core API utilities: URL helpers, auth token management, request wrapper.
 * Tất cả các domain API file import từ đây.
 */

const EXTERNAL_API_URL = import.meta.env.VITE_EXTERNAL_API_URL;
const SERVER_VPS_API_URL = import.meta.env.VITE_EXPRESSTURN_API_URL || EXTERNAL_API_URL || 'https://api.alin.city';

export const getBaseUrl = (urlOverride?: string): string => {
  let url = urlOverride || localStorage.getItem('cloudflareUrl') || EXTERNAL_API_URL || 'http://localhost:3001';

  if (url.includes('alin-api.alin.city')) {
    url = url.replace('alin-api.alin.city', 'api.alin.city');
    if (localStorage.getItem('cloudflareUrl')?.includes('alin-api.alin.city')) {
      localStorage.setItem('cloudflareUrl', url);
    }
  }

  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
};

export const getLooterServerUrl = (): string => {
  const baseUrl = getBaseUrl();
  if (baseUrl.includes('alin.city')) return 'https://looter.alin.city';
  return 'http://localhost:3002';
};

export const getServerVpsBaseUrl = (): string => {
  let url = SERVER_VPS_API_URL;
  if (url.includes('alin-api.alin.city')) url = url.replace('alin-api.alin.city', 'api.alin.city');
  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
};

export const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = getBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

export const getToken = (): string | null => localStorage.getItem('accessToken');

export const setToken = (token: string): void => {
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
};

export const clearDeviceId = (): void => {
  localStorage.removeItem('deviceId');
  localStorage.removeItem('accessToken');
};

export const checkStatus = async (urlOverride?: string): Promise<{ status: 'online' | 'offline'; message?: string }> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const baseUrl = getBaseUrl(urlOverride);
    const headers: HeadersInit = { Accept: 'application/json' };

    let response = await fetch(`${baseUrl}/api/health`, { method: 'GET', headers, signal: controller.signal });
    if (response.status === 404) response = await fetch(`${baseUrl}/api/list-server`, { method: 'GET', headers, signal: controller.signal });
    if (response.status === 404) response = await fetch(`${baseUrl}/health`, { method: 'GET', headers, signal: controller.signal });
    if (response.status === 404) response = await fetch(`${baseUrl}/`, { method: 'GET', headers, signal: controller.signal });

    clearTimeout(timeoutId);
    if (response.ok) return { status: 'online' };

    let data: any = {};
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => '');
      data = text.includes('<!doctype') || text.includes('<html')
        ? { error: 'Server returned HTML instead of JSON', details: 'Endpoint does not exist or server is experiencing issues.' }
        : { error: text || 'Unknown error' };
    }

    return { status: 'offline', message: data.details || data.error || `HTTP ${response.status}: ${data.message || 'Endpoint not found'}` };
  } catch (error: any) {
    let message = 'Connection failed';
    if (error.name === 'AbortError') {
      message = 'Connection timeout';
    } else if (error.message === 'Failed to fetch' || error.message?.includes('fetch')) {
      console.error('External API check failed:', error);
      message = 'Proxy unreachable';
      if (!urlOverride && localStorage.getItem('cloudflareUrl')) {
        console.warn('Auto-clearing broken cloudflareUrl to allow local fallback');
        localStorage.removeItem('cloudflareUrl');
      }
    } else {
      console.error('External API check failed:', error);
    }
    return { status: 'offline', message };
  }
};

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const deviceId = getDeviceId();
  const baseUrl = getBaseUrl();

  let url = `${baseUrl}/${path}`;
  url += url.includes('?') ? `&deviceId=${encodeURIComponent(deviceId)}` : `?deviceId=${encodeURIComponent(deviceId)}`;

  const adminKey = import.meta.env.VITE_ADMIN_KEY;
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId,
    ...(token ? { Authorization: `Bearer ${token}` } : adminKey ? { Authorization: `Bearer ${adminKey}` } : {}),
    ...options.headers,
  };

  const body = options.body ? JSON.parse(options.body as string) : {};
  const finalOptions: RequestInit = { ...options, headers };

  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    finalOptions.body = JSON.stringify({ ...body, deviceId });
  }

  const response = await fetch(url, finalOptions);
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    let errorData: any = {};
    if (contentType?.includes('application/json')) {
      errorData = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => 'Unknown error');
      errorData = text.includes('<!doctype') || text.includes('<html')
        ? { error: `Server returned HTML instead of JSON (Status ${response.status})`, details: 'Endpoint might not exist or server is experiencing issues. Please check backend.' }
        : { error: text };
    }
    const message = errorData.details
      ? `${errorData.error}: ${errorData.details}`
      : errorData.message || errorData.error || `API request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (contentType?.includes('application/json')) return response.json();
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { message: text } as any; }
}

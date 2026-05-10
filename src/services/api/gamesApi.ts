import { request, getBaseUrl, getDeviceId, getToken } from './coreApi';

export const listServer = (): Promise<{ success: boolean; games: any[] }> =>
  request('/api/list-server');

export const syncTunnelUrl = (tunnelUrl: string): Promise<any> =>
  request('/api/admin/sync-tunnel', { method: 'POST', body: JSON.stringify({ tunnelUrl }) });

export const getUserGames = (userIdOrEmail: string): Promise<{ success: boolean; games: any[] }> =>
  request(`/api/user-games/${encodeURIComponent(userIdOrEmail)}`);

export const publishGame = (name: string, code: string): Promise<any> =>
  request('/api/upload-server', { method: 'POST', body: JSON.stringify({ name, code }) });

export const uploadZip = (formData: FormData, onProgress?: (percent: number) => void): Promise<any> => {
  const deviceId = getDeviceId();
  formData.append('deviceId', deviceId);
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/upload-zip?deviceId=${encodeURIComponent(deviceId)}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('X-Device-Id', deviceId);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('content-type');
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(contentType?.includes('application/json') ? JSON.parse(xhr.responseText) : { success: true, message: xhr.responseText });
        } catch { resolve({ success: true }); }
      } else {
        let errorData: any = { message: `Upload failed with status ${xhr.status}` };
        try {
          if (contentType?.includes('application/json')) {
            errorData = JSON.parse(xhr.responseText);
          } else {
            const text = xhr.responseText;
            errorData = { message: text.includes('<!doctype') || text.includes('<html')
              ? `Server returned HTML instead of JSON (Status ${xhr.status}). Endpoint might not exist.`
              : text || `Upload failed with status ${xhr.status}` };
          }
        } catch { /* ignore */ }
        reject(new Error(errorData.message || errorData.error || `Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error occurred during upload.'));
    xhr.send(formData);
  });
};

export const previewZip = async (formData: FormData): Promise<any> => {
  const deviceId = getDeviceId();
  formData.append('deviceId', deviceId);
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/api/preview-zip?deviceId=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Device-Id': deviceId,
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });

  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorData: any = {};
    if (contentType?.includes('application/json')) {
      errorData = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => 'Unknown error');
      errorData = text.includes('<!doctype') || text.includes('<html')
        ? { error: `Server returned HTML instead of JSON (Status ${response.status})`, details: 'Endpoint might not exist.' }
        : { error: text };
    }
    throw new Error(errorData.message || errorData.error || `Preview failed with status ${response.status}`);
  }

  if (contentType?.includes('application/json')) return response.json();
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { message: text } as any; }
};

export const deleteGame = (gameId: number | string): Promise<any> =>
  request('/api/delete-game', { method: 'POST', body: JSON.stringify({ id: gameId }) });

export const getGameReviews = (gameId: number | string): Promise<{ success: boolean; reviews: any[] }> =>
  request(`/api/games/${gameId}/reviews`);

export const updateGameMetadata = (gameId: number | string, metadata: { title?: string; category?: string }): Promise<any> =>
  request(`/api/games/${gameId}/metadata`, { method: 'PUT', body: JSON.stringify(metadata) });

export const downloadZip = async (gameId: number | string): Promise<Blob> => {
  const deviceId = getDeviceId();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/download-zip?id=${gameId}&deviceId=${encodeURIComponent(deviceId)}`;
  const headers: HeadersInit = {
    'X-Device-Id': deviceId,
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  };

  const response = await fetch(url, { headers });
  if (response.ok) return response.blob();

  let errorMsg = response.statusText;
  try {
    const errorData = await response.json();
    if (errorData.error) errorMsg = errorData.error;
    if (errorData.details) errorMsg += ` - ${errorData.details}`;
  } catch { /* ignore */ }
  throw new Error(`Failed to download game ZIP: ${errorMsg}`);
};

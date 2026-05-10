import { request, getBaseUrl, getDeviceId, getToken } from './coreApi';

export const syncGoogleLogin = async (token: string): Promise<any> => {
  const baseUrl = getBaseUrl();
  const deviceId = getDeviceId();

  const response = await fetch(`${baseUrl}/api/auth/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
    body: JSON.stringify({ token, deviceId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Google login failed');
  }
  return response.json();
};

export const syncUser = (userData: { uid: string; displayName: string | null; photoURL: string | null; email: string | null }): Promise<any> =>
  request('/api/user-sync', { method: 'POST', body: JSON.stringify(userData) });

export const uploadAvatar = async (file: File): Promise<{ success: boolean; url: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${baseUrl}/api/profile/upload-avatar`, {
      method: 'POST',
      headers: {
        'X-Device-Id': getDeviceId(),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    return response.json();
  } catch (error) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
};

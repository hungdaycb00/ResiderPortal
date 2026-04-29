/**
 * Service to handle communication with the external server via Cloudflare Tunnel.
 */

const EXTERNAL_API_URL = import.meta.env.VITE_EXTERNAL_API_URL;
const SERVER_VPS_API_URL = import.meta.env.VITE_EXPRESSTURN_API_URL || EXTERNAL_API_URL || 'https://api.alin.city';

export const getBaseUrl = (urlOverride?: string): string => {
  let url = urlOverride || localStorage.getItem('cloudflareUrl') || EXTERNAL_API_URL || 'http://localhost:3001';
  
  // Auto-correct broken subdomains if necessary
  if (url.includes('alin-api.alin.city')) {
    url = url.replace('alin-api.alin.city', 'api.alin.city');
    // If it was in localStorage, fix it there too
    if (localStorage.getItem('cloudflareUrl')?.includes('alin-api.alin.city')) {
      localStorage.setItem('cloudflareUrl', url);
    }
  }

  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

export const getLooterServerUrl = (): string => {
  const baseUrl = getBaseUrl();
  if (baseUrl.includes('alin.city')) {
    return 'https://looter.alin.city';
  }
  return 'http://localhost:3002';
};

export const getServerVpsBaseUrl = (): string => {
  let url = SERVER_VPS_API_URL;
  if (url.includes('alin-api.alin.city')) {
    url = url.replace('alin-api.alin.city', 'api.alin.city');
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

export const normalizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const baseUrl = getBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const externalApi = {
  /**
   * Check if the external server is reachable.
   * Assumes the server has a /health or /ping endpoint.
   */
  async checkStatus(urlOverride?: string): Promise<{ status: 'online' | 'offline', message?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const baseUrl = getBaseUrl(urlOverride);

      const headers: HeadersInit = {
        'Accept': 'application/json',
      };

      // Try /api/health first
      let response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      // If 404, try /api/list-server (as a health check since it's a known endpoint)
      if (response.status === 404) {
        response = await fetch(`${baseUrl}/api/list-server`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      }

      // If still 404, try /health
      if (response.status === 404) {
        response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      }

      // If still 404, try /
      if (response.status === 404) {
        response = await fetch(`${baseUrl}/`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: 'online' };
      }
      
      let data: any = {};
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => "");
        if (text.includes("<!doctype") || text.includes("<html")) {
          data = { error: "Server returned HTML instead of JSON", details: "Endpoint does not exist or server is experiencing issues." };
        } else {
          data = { error: text || "Unknown error" };
        }
      }

      return { 
        status: 'offline', 
        message: data.details || data.error || `HTTP ${response.status}: ${data.message || 'Endpoint not found'}` 
      };
    } catch (error: any) {
      let message = 'Connection failed';
      if (error.name === 'AbortError') {
        message = 'Connection timeout';
      } else if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
        console.error('External API check failed:', error);
        message = 'Proxy unreachable';
        // Auto-clear broken tunnel URL to allow fallback to local port
        if (!urlOverride && localStorage.getItem('cloudflareUrl')) {
          console.warn('Auto-clearing broken cloudflareUrl to allow local fallback');
          localStorage.removeItem('cloudflareUrl');
        }
      } else {
        console.error('External API check failed:', error);
      }

      return { status: 'offline', message };
    }
  },

  /**
   * Helper to get or generate a device ID.
   */
  getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  },

  /**
   * Clear the device ID to force re-registration.
   */
  clearDeviceId(): void {
    localStorage.removeItem('deviceId');
  },

  /**
   * Generic fetch wrapper for the external API.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure endpoint starts with a slash
    const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const deviceId = this.getDeviceId();
    const baseUrl = getBaseUrl();
    
    // For GET requests, add deviceId as query param
    let url = `${baseUrl}/${path}`;
    if (url.includes('?')) {
      url += `&deviceId=${encodeURIComponent(deviceId)}`;
    } else {
      url += `?deviceId=${encodeURIComponent(deviceId)}`;
    }
    
    const adminKey = import.meta.env.VITE_ADMIN_KEY;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
      ...(adminKey ? { 'Authorization': `Bearer ${adminKey}` } : {}),
      ...options.headers,
    };

    const body = options.body ? JSON.parse(options.body as string) : {};
    
    // For POST/PUT/PATCH requests, add deviceId to body
    const finalOptions: RequestInit = {
      ...options,
      headers,
    };

    if (options.method && ["POST", "PUT", "PATCH"].includes(options.method.toUpperCase())) {
      finalOptions.body = JSON.stringify({
        ...body,
        deviceId: deviceId,
      });
    }

    const response = await fetch(url, finalOptions);
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      let errorData: any = {};
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => "Unknown error");
        // If we got HTML, it's likely a 404 or 500 from a proxy/server
        if (text.includes("<!doctype") || text.includes("<html")) {
          errorData = { 
            error: `Server returned HTML instead of JSON (Status ${response.status})`, 
            details: "Endpoint might not exist or server is experiencing issues. Please check backend." 
          };
        } else {
          errorData = { error: text };
        }
      }
      
      const message = errorData.details 
        ? `${errorData.error}: ${errorData.details}` 
        : (errorData.message || errorData.error || `API request failed with status ${response.status}`);
      
      throw new Error(message);
    }

    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        // If it's not JSON but the request was successful, return as is or wrap it
        return { message: text } as any;
      }
    }
  },

  /**
   * Get list of games from the external server.
   */
  async listServer(): Promise<{ success: boolean, games: any[] }> {
    return externalApi.request<{ success: boolean, games: any[] }>('/api/list-server');
  },

  // Sync tunnel URL to all games on server
  async syncTunnelUrl(tunnelUrl: string) {
    return this.request('/api/admin/sync-tunnel', {
      method: 'POST',
      body: JSON.stringify({ tunnelUrl })
    });
  },

  /**
   * Get games for a specific user ID or email.
   */
  async getUserGames(userIdOrEmail: string): Promise<{ success: boolean, games: any[] }> {
    return externalApi.request<{ success: boolean, games: any[] }>(`/api/user-games/${encodeURIComponent(userIdOrEmail)}`);
  },

  /**
   * Get list of friends from the external server.
   */
  async getFriends(): Promise<{ success: boolean, friends: any[], requests: any[] }> {
    return externalApi.request<{ success: boolean, friends: any[], requests: any[] }>('/api/friends');
  },

  /**
   * Add a new friend.
   */
  async addFriend(targetId: string): Promise<any> {
    return externalApi.request('/api/friends/add', {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
  },

  /**
   * Accept a friend request.
   */
  async acceptFriend(targetId: string): Promise<any> {
    return externalApi.request('/api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
  },

  /**
   * Reject a friend request.
   */
  async rejectFriend(targetId: string): Promise<any> {
    return externalApi.request('/api/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
  },

  /**
   * Remove a friend.
   */
  async removeFriend(targetId: string): Promise<any> {
    return externalApi.request('/api/friends/remove', {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
  },

  /**
   * Get world chat messages.
   */
  async getWorldChat(): Promise<any[]> {
    return externalApi.request<any[]>('/api/chat/world');
  },

  /**
   * Send a message to world chat.
   */
  async sendWorldChat(message: string): Promise<any> {
    return externalApi.request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message, type: 'world' }),
    });
  },

  /**
   * Publish a new game to the server using HTML code.
   * Matches doc: POST /api/upload-server { name, code }
   */
  async publishGame(name: string, code: string): Promise<any> {
    return externalApi.request('/api/upload-server', {
      method: 'POST',
      body: JSON.stringify({ name, code }),
    });
  },

  /**
   * Publish a new game to the server using ZIP file.
   */
  async uploadZip(formData: FormData, onProgress?: (percent: number) => void): Promise<any> {
    const deviceId = this.getDeviceId();
    formData.append('deviceId', deviceId);
    
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/upload-zip?deviceId=${encodeURIComponent(deviceId)}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      
      xhr.setRequestHeader('X-Device-Id', deviceId);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader('content-type');
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            if (contentType && contentType.includes('application/json')) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              resolve({ success: true, message: xhr.responseText });
            }
          } catch (e) {
            resolve({ success: true });
          }
        } else {
          let errorData: any = { message: `Upload failed with status ${xhr.status}` };
          try {
            if (contentType && contentType.includes('application/json')) {
              errorData = JSON.parse(xhr.responseText);
            } else {
              const text = xhr.responseText;
              if (text.includes("<!doctype") || text.includes("<html")) {
                errorData = { message: `Server returned HTML instead of JSON (Status ${xhr.status}). Endpoint might not exist.` };
              } else {
                errorData = { message: text || `Upload failed with status ${xhr.status}` };
              }
            }
          } catch (e) {}
          reject(new Error(errorData.message || errorData.error || `Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during upload.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Preview a game using ZIP file.
   */
  async previewZip(formData: FormData): Promise<any> {
    const deviceId = this.getDeviceId();
    formData.append('deviceId', deviceId);
    
    const baseUrl = getBaseUrl();
    
    const response = await fetch(`${baseUrl}/api/preview-zip?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Device-Id': deviceId,
      },
    });

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      let errorData: any = {};
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => "Unknown error");
        if (text.includes("<!doctype") || text.includes("<html")) {
          errorData = { error: `Server returned HTML instead of JSON (Status ${response.status})`, details: "Endpoint might not exist." };
        } else {
          errorData = { error: text };
        }
      }
      throw new Error(errorData.message || errorData.error || `Preview failed with status ${response.status}`);
    }

    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { message: text } as any;
      }
    }
  },

  /**
   * Sync Google Login token with the server.
   */
  async syncGoogleLogin(token: string): Promise<any> {
    const baseUrl = getBaseUrl();
    const deviceId = this.getDeviceId();
    
    const response = await fetch(`${baseUrl}/api/auth/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ token, deviceId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Google login failed');
    }

    return response.json();
  },

  /**
   * Sync user data with the server (Legacy).
   */
  async syncUser(userData: { uid: string, displayName: string | null, photoURL: string | null, email: string | null }): Promise<any> {
    return externalApi.request('/api/user-sync', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Delete a game from the server.
   */
  async deleteGame(gameId: number | string): Promise<any> {
    return externalApi.request('/api/delete-game', {
      method: 'POST',
      body: JSON.stringify({ id: gameId }),
    });
  },

  /**
   * Get reviews for a game.
   */
  async getGameReviews(gameId: number | string): Promise<{ success: boolean, reviews: any[] }> {
    return externalApi.request<{ success: boolean, reviews: any[] }>(`/api/games/${gameId}/reviews`);
  },

  /**
   * Update game metadata (title, category, etc).
   */
  async updateGameMetadata(gameId: number | string, metadata: { title?: string, category?: string }): Promise<any> {
    return externalApi.request(`/api/games/${gameId}/metadata`, {
      method: 'PUT',
      body: JSON.stringify(metadata),
    });
  },

  /**
   * Download a game ZIP from the server.
   */
  async downloadZip(gameId: number | string): Promise<Blob> {
    const deviceId = this.getDeviceId();
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/download-zip?id=${gameId}&deviceId=${encodeURIComponent(deviceId)}`;
    
    const headers: HeadersInit = {
      'X-Device-Id': deviceId,
    };

    const response = await fetch(url, { headers });

    if (response.ok) {
      return response.blob();
    }
    
    let errorMsg = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
      if (errorData.details) errorMsg += ` - ${errorData.details}`;
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new Error(`Failed to download game ZIP: ${errorMsg}`);
  },

  /**
   * Upload user avatar photo
   */
  async uploadAvatar(file: File): Promise<{ success: boolean; url: string }> {
    try {
      const baseUrl = getBaseUrl();
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${baseUrl}/api/profile/upload-avatar`, {
        method: 'POST',
        headers: {
          'X-Device-Id': this.getDeviceId()
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  },



  /**
   * P2P ROOMS API
   */
  async getP2PRooms(gameId: string): Promise<any[]> {
    return this.request(`/api/rooms/p2p?gameId=${encodeURIComponent(gameId)}`) as Promise<any[]>;
  },

  async createP2PRoom(data: { name: string, hostId: string, hostName: string, password?: string, gameId: string, region: string }): Promise<{ success: boolean, roomId: string }> {
    return this.request('/api/rooms/p2p/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async sendHeartbeat(roomId: string, data: { hostId: string, members: any[] }): Promise<any> {
    return this.request(`/api/rooms/p2p/${roomId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async joinP2PRoom(roomId: string, data: { playerId: string, playerName: string, password?: string }): Promise<any> {
    return this.request(`/api/rooms/p2p/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async leaveP2PRoom(roomId: string): Promise<any> {
    return this.request(`/api/rooms/p2p/${roomId}/leave`, {
      method: 'POST',
    });
  },
};

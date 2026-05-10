import { request } from './coreApi';

export const getFriends = (): Promise<{ success: boolean; friends: any[]; requests: any[] }> =>
  request('/api/friends');

export const addFriend = (targetId: string): Promise<any> =>
  request('/api/friends/add', { method: 'POST', body: JSON.stringify({ targetId }) });

export const acceptFriend = (targetId: string): Promise<any> =>
  request('/api/friends/accept', { method: 'POST', body: JSON.stringify({ targetId }) });

export const rejectFriend = (targetId: string): Promise<any> =>
  request('/api/friends/reject', { method: 'POST', body: JSON.stringify({ targetId }) });

export const removeFriend = (targetId: string): Promise<any> =>
  request('/api/friends/remove', { method: 'POST', body: JSON.stringify({ targetId }) });

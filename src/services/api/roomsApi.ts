import { request } from './coreApi';

export const getP2PRooms = (gameId: string): Promise<any[]> =>
  request(`/api/rooms/p2p?gameId=${encodeURIComponent(gameId)}`);

export const createP2PRoom = (data: { name: string; hostId: string; hostName: string; password?: string; gameId: string; region: string }): Promise<{ success: boolean; roomId: string }> =>
  request('/api/rooms/p2p/create', { method: 'POST', body: JSON.stringify(data) });

export const sendHeartbeat = (roomId: string, data: { hostId: string; members: any[] }): Promise<any> =>
  request(`/api/rooms/p2p/${roomId}/heartbeat`, { method: 'POST', body: JSON.stringify(data) });

export const joinP2PRoom = (roomId: string, data: { playerId: string; playerName: string; password?: string }): Promise<any> =>
  request(`/api/rooms/p2p/${roomId}/join`, { method: 'POST', body: JSON.stringify(data) });

export const leaveP2PRoom = (roomId: string): Promise<any> =>
  request(`/api/rooms/p2p/${roomId}/leave`, { method: 'POST' });

import { request } from './coreApi';

export const getWorldChat = (): Promise<any[]> => request('/api/chat/world');

export const sendWorldChat = (message: string): Promise<any> =>
  request('/api/chat/send', { method: 'POST', body: JSON.stringify({ message, type: 'world' }) });

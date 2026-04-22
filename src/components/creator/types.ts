export type DeviceType = 'pc' | 'tablet' | 'mobile';
export type Orientation = 'portrait' | 'landscape';
export type PublishStatusType = 'info' | 'success' | 'error';
export type DocGraphics = '2d' | '3d';
export type DocMode = 'offline' | 'multiplayer';

export interface CreatorViewProps {
  user: any;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPublishSuccess: () => void;
  onPlayGame: (game: any) => void;
  cloudflareUrl: string;
  triggerAuth: (callback: () => void) => void;
  externalOpenList?: boolean;
  onOpenListChange?: (open: boolean) => void;
}

export interface GameData {
  id: string | number;
  name?: string;
  title?: string;
  category?: string;
  rating?: string;
  image?: string;
  thumbnail_url?: string;
  normalizedImage?: string;
  deviceId?: string;
}

export interface FeedbackData {
  avatar_url?: string;
  display_name?: string;
  created_at: string;
  rating: number;
  comment?: string;
}

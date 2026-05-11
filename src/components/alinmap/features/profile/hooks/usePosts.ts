import type React from 'react';
import { useSocialFeed } from '../../social/hooks/useSocialFeed';
import { useProfilePosts } from './useProfilePosts';

interface UsePostsParams {
  ws: React.MutableRefObject<WebSocket | null>;
  externalApi: any;
  myUserId: string | null;
  user: any;
  selectedUser: any;
  viewerLocation?: { lat: number; lng: number } | null;
  showNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
  triggerAuth?: (callback: () => void) => void;
  setGalleryActive: (v: boolean) => void;
  setGalleryTitle: (v: string) => void;
  setGalleryImages: (v: string[]) => void;
}

export function usePosts(params: UsePostsParams) {
  const social = useSocialFeed({
    externalApi: params.externalApi,
    viewerLocation: params.viewerLocation,
  });

  const profile = useProfilePosts({
    ws: params.ws,
    externalApi: params.externalApi,
    myUserId: params.myUserId,
    user: params.user,
    selectedUser: params.selectedUser,
    showNotification: params.showNotification,
    triggerAuth: params.triggerAuth,
    setGalleryActive: params.setGalleryActive,
    setGalleryTitle: params.setGalleryTitle,
    setGalleryImages: params.setGalleryImages,
    onPostsChanged: social.fetchFeedPosts,
  });

  return {
    ...profile,
    feedPosts: social.feedPosts,
    fetchFeedPosts: social.fetchFeedPosts,
  };
}

import { useCallback, useRef, useState } from 'react';
import { getBaseUrl } from '../../../../../services/externalApi';

interface UseSocialFeedParams {
  externalApi: any;
  viewerLocation?: { lat: number; lng: number } | null;
}

export function useSocialFeed({ externalApi, viewerLocation }: UseSocialFeedParams) {
  const API_BASE = getBaseUrl();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const activeFeedRequestRef = useRef(0);

  const fetchFeedPosts = useCallback(async (requestId?: number) => {
    const currentRequestId = requestId ?? Date.now();
    activeFeedRequestRef.current = currentRequestId;

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (viewerLocation && Number.isFinite(viewerLocation.lat) && Number.isFinite(viewerLocation.lng)) {
        params.set('lat', String(viewerLocation.lat));
        params.set('lng', String(viewerLocation.lng));
      }

      const resp = await fetch(`${API_BASE}/api/posts/feed?${params.toString()}`, {
        headers: { 'X-Device-Id': externalApi.getDeviceId() },
      });
      const data = await resp.json();
      if (activeFeedRequestRef.current !== currentRequestId) return;
      if (data.success) {
        setFeedPosts(Array.isArray(data.posts) ? data.posts : []);
      }
    } catch (err) {
      console.error('Fetch feed posts error:', err);
    }
  }, [API_BASE, externalApi, viewerLocation?.lat, viewerLocation?.lng]);

  return {
    feedPosts,
    fetchFeedPosts,
    setFeedPosts,
  };
}

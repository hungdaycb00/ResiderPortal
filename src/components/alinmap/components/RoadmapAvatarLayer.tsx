import React from 'react';
import { MotionValue } from 'framer-motion';
import SpatialNode from '../SpatialNode';
import {
  clamp,
  getRoadmapCenterFromPan,
  getRoadmapTileScale,
  getRoadmapTileZoom,
  ROADMAP_TILE_SIZE,
  type AlinMapMode,
} from '../constants';

interface RoadmapAvatarLayerProps {
  nearbyUsers: any[];
  myUserId: string | null;
  user: any;
  myDisplayName: string;
  myAvatarUrl: string;
  myStatus: string;
  galleryActive: boolean;
  galleryTitle: string;
  galleryImages: string[];
  myObfPos: { lat: number; lng: number } | null;
  searchTag: string;
  filterDistance: number;
  filterAgeMin: number;
  filterAgeMax: number;
  scale: MotionValue<number>;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  planeYScale: MotionValue<number>;
  mapMode: AlinMapMode;
  isLooterGameMode?: boolean;
  onSelectUser?: (user: any) => void;
  onSelectSelf?: (user: any) => void;
}

const useViewportSize = () => {
  const [size, setSize] = React.useState(() => ({
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  React.useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

const useMotionSnapshot = (value: MotionValue<number>) => {
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return React.useSyncExternalStore(
    React.useCallback((notify) => value.on('change', () => {
      if (typeof window === 'undefined') { notify(); return; }
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        notify();
      });
    }), [value]),
    React.useCallback(() => value.get(), [value]),
    React.useCallback(() => value.get(), [value])
  );
};

const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;

const latToTileY = (lat: number, zoom: number) => {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const rad = safeLat * Math.PI / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

const toScreenPosition = (
  center: { lat: number; lng: number },
  target: { lat: number; lng: number },
  visualScale: number,
  viewport: { width: number; height: number }
) => {
  const zoom = getRoadmapTileZoom(visualScale);
  const tileScale = getRoadmapTileScale(visualScale);
  const centerTileX = lngToTileX(center.lng, zoom);
  const centerTileY = latToTileY(center.lat, zoom);
  const targetTileX = lngToTileX(target.lng, zoom);
  const targetTileY = latToTileY(target.lat, zoom);
  const centerPixelX = centerTileX * ROADMAP_TILE_SIZE;
  const centerPixelY = centerTileY * ROADMAP_TILE_SIZE;

  return {
    x: viewport.width / 2 + (targetTileX * ROADMAP_TILE_SIZE - centerPixelX) * tileScale,
    y: viewport.height / 2 + (targetTileY * ROADMAP_TILE_SIZE - centerPixelY) * tileScale,
  };
};

const RoadmapAvatarLayer: React.FC<RoadmapAvatarLayerProps> = ({
  nearbyUsers,
  myUserId,
  user,
  myDisplayName,
  myAvatarUrl,
  myStatus,
  galleryActive,
  galleryTitle,
  galleryImages,
  myObfPos,
  searchTag,
  filterDistance,
  filterAgeMin,
  filterAgeMax,
  scale,
  panX,
  panY,
  planeYScale,
  mapMode,
  isLooterGameMode = false,
  onSelectUser,
  onSelectSelf,
}) => {
  const viewport = useViewportSize();
  const visualScale = useMotionSnapshot(scale);
  const currentPanX = useMotionSnapshot(panX);
  const currentPanY = useMotionSnapshot(panY);
  const currentPlaneYScale = useMotionSnapshot(planeYScale);

  const center = React.useMemo(() => {
    if (!myObfPos) return null;
    return getRoadmapCenterFromPan(myObfPos, currentPanX, currentPanY, currentPlaneYScale);
  }, [currentPanX, currentPanY, currentPlaneYScale, myObfPos]);

  const nodes = React.useMemo(() => {
    if (!center || !myObfPos) return [];
    const term = String(searchTag || '').toLowerCase();
    const userGallery = user?.gallery ?? {};
    const selfGalleryActive = galleryActive || !!userGallery.active;
    const selfGalleryTitle = galleryTitle || String(userGallery.title || '');
    const selfGalleryImages = galleryImages.length > 0
      ? galleryImages
      : (Array.isArray(userGallery.images) ? userGallery.images : []);
    const filtered = nearbyUsers.filter((u) => {
      if (u.id === myUserId || u.id === user?.uid) return false;
      if (u.lat == null || u.lng == null || Number.isNaN(u.lat) || Number.isNaN(u.lng)) return false;
      if (searchTag) {
        const matchesName = String(u.displayName || u.username || '').toLowerCase().includes(term);
        const tagsStr = (Array.isArray(u.tags) ? u.tags.join(' ') : String(u.tags || '')).toLowerCase();
        const statusStr = String(u.status || '').toLowerCase();
        if (!matchesName && !tagsStr.includes(term) && !statusStr.includes(term)) return false;
      }
      const distKm = Math.sqrt(((u.lat - myObfPos.lat) ** 2) + ((u.lng - myObfPos.lng) ** 2)) * 111;
      if (distKm > filterDistance) return false;
      const age = u.birthdate ? (new Date().getFullYear() - new Date(u.birthdate).getFullYear()) : 20;
      if (age < filterAgeMin || age > filterAgeMax) return false;
      return true;
    });

    const selfUser = {
      id: 'self',
      displayName: myDisplayName || user?.displayName || 'Me',
      username: myDisplayName || user?.displayName || 'Me',
      avatar_url: myAvatarUrl || user?.photoURL || '',
      status: myStatus,
      gallery: selfGalleryActive ? {
        active: true,
        title: selfGalleryTitle,
        images: selfGalleryImages,
      } : { active: false, title: '', images: [] },
      isSelf: true,
    };

    return [
      { key: 'self', user: selfUser, pos: myObfPos },
      ...filtered.map((u) => ({ key: u.id, user: u, pos: { lat: u.lat, lng: u.lng } })),
    ].map((entry) => ({
      ...entry,
      screenPosition: toScreenPosition(center, entry.pos, visualScale, viewport),
    }));
  }, [
    center,
    myObfPos,
    nearbyUsers,
    myDisplayName,
    myAvatarUrl,
    myStatus,
    galleryActive,
    galleryTitle,
    galleryImages,
    myUserId,
    user?.uid,
    user?.displayName,
    user?.photoURL,
    user?.gallery?.active,
    user?.gallery?.title,
    user?.gallery?.images,
    searchTag,
    filterDistance,
    filterAgeMin,
    filterAgeMax,
    visualScale,
    viewport,
  ]);

  if (mapMode !== 'roadmap' || isLooterGameMode || !center || !myObfPos) return null;

  return (
    <div className="absolute inset-0 z-[12] pointer-events-none">
      {nodes.map((entry) => (
        <SpatialNode
          key={entry.key}
          user={entry.user}
          myPos={center}
          mapScale={scale}
          screenPosition={entry.screenPosition}
          onClick={() => {
            if (entry.user.isSelf) {
              onSelectSelf?.(entry.user);
              return;
            }
            onSelectUser?.(entry.user);
          }}
          onContextMenu={undefined}
        />
      ))}
    </div>
  );
};

export default React.memo(RoadmapAvatarLayer);

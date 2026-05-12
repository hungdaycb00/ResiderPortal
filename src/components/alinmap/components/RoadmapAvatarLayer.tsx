import React from 'react';
import { MotionValue } from 'framer-motion';
import SpatialNode from '../SpatialNode';
import { clamp, getRoadmapCenterFromPan, type AlinMapMode } from '../constants';

interface RoadmapAvatarLayerProps {
  nearbyUsers: any[];
  myUserId: string | null;
  user: any;
  myDisplayName: string;
  myAvatarUrl: string;
  myStatus: string;
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

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

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
  const [snapshot, setSnapshot] = React.useState(value.get());
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const unsubscribe = value.on('change', (latest) => {
      if (typeof window === 'undefined') {
        setSnapshot(latest);
        return;
      }
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setSnapshot(latest);
      });
    });

    return () => {
      unsubscribe();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return snapshot;
};

const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;

const latToTileY = (lat: number, zoom: number) => {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const rad = safeLat * Math.PI / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

const getTileZoom = (visualScale: number) => {
  const safeScale = Math.max(visualScale || 1, 0.05);
  return clamp(Math.round(14 + Math.log2(safeScale / 1.35) * 1.45), MIN_ZOOM, MAX_ZOOM);
};

const toScreenPosition = (
  center: { lat: number; lng: number },
  target: { lat: number; lng: number },
  visualScale: number,
  viewport: { width: number; height: number }
) => {
  const zoom = getTileZoom(visualScale);
  const tileScale = clamp(visualScale / 1.25, 0.9, 2.4);
  const centerTileX = lngToTileX(center.lng, zoom);
  const centerTileY = latToTileY(center.lat, zoom);
  const targetTileX = lngToTileX(target.lng, zoom);
  const targetTileY = latToTileY(target.lat, zoom);
  const centerPixelX = centerTileX * TILE_SIZE;
  const centerPixelY = centerTileY * TILE_SIZE;

  return {
    x: viewport.width / 2 + (targetTileX * TILE_SIZE - centerPixelX) * tileScale,
    y: viewport.height / 2 + (targetTileY * TILE_SIZE - centerPixelY) * tileScale,
  };
};

const RoadmapAvatarLayer: React.FC<RoadmapAvatarLayerProps> = ({
  nearbyUsers,
  myUserId,
  user,
  myDisplayName,
  myAvatarUrl,
  myStatus,
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
      isSelf: true,
    };

    return [
      { key: 'self', user: selfUser, pos: myObfPos },
      ...filtered.map((u) => ({ key: u.id, user: u, pos: { lat: u.lat, lng: u.lng } })),
    ].map((entry) => ({
      ...entry,
      screenPosition: toScreenPosition(center, entry.pos, visualScale, viewport),
    }));
  }, [center, myObfPos, nearbyUsers, myDisplayName, myAvatarUrl, myStatus, myUserId, user?.uid, user?.displayName, user?.photoURL, searchTag, filterDistance, filterAgeMin, filterAgeMax, visualScale, viewport]);

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

import React from 'react';
import type { MotionValue } from 'framer-motion';
import { sanitizeWorldItems, useLooterActions, useLooterState } from '../looter-game/LooterGameContext';
import { getDistanceMeters } from '../looter-game/backpack/utils';
import { DEGREES_TO_PX, getRoadmapCenterFromPan, getRoadmapTileZoom, ROADMAP_TILE_SIZE, clamp } from '../constants';
import { makeLootSpriteTexture } from '../three/sceneUtils';

interface LooterMapPlaneLayerProps {
  myObfPos: { lat: number; lng: number } | null;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  scale: MotionValue<number>;
  planeYScale: MotionValue<number>;
  boatTargetPin?: { lat: number; lng: number } | null;
  boatOffsetX?: MotionValue<number>;
  boatOffsetY?: MotionValue<number>;
  onRequestMove?: (lat: number, lng: number, source?: string) => void;
  onStopBoat?: () => void;
  onSetArrivalAction?: (action: (() => void) | null) => void;
  planeScale?: number;
}

type LatLng = { lat: number; lng: number };

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

const useMotionSnapshot = (value?: MotionValue<number>) => {
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return React.useSyncExternalStore(
    React.useCallback((notify) => {
      if (!value) return () => {};
      return value.on('change', () => {
        if (typeof window === 'undefined') { notify(); return; }
        if (frameRef.current !== null) return;
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          notify();
        });
      });
    }, [value]),
    React.useCallback(() => value?.get() ?? 0, [value]),
    React.useCallback(() => value?.get() ?? 0, [value])
  );
};

const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;

const latToTileY = (lat: number, zoom: number) => {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const rad = safeLat * Math.PI / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

const projectToPlane = (
  center: LatLng,
  target: LatLng,
  visualScale: number,
  planeSize: number
) => {
  const zoom = getRoadmapTileZoom(visualScale);
  const centerTileX = lngToTileX(center.lng, zoom);
  const centerTileY = latToTileY(center.lat, zoom);
  const targetTileX = lngToTileX(target.lng, zoom);
  const targetTileY = latToTileY(target.lat, zoom);

  return {
    x: planeSize / 2 + (targetTileX - centerTileX) * ROADMAP_TILE_SIZE,
    y: planeSize / 2 + (targetTileY - centerTileY) * ROADMAP_TILE_SIZE,
  };
};

const getWorldItemIcon = (worldItem: any): string | undefined => {
  if (worldItem?.item?.icon) return worldItem.item.icon;
  return undefined;
};

const getWorldItemType = (worldItem: any) => {
  if (worldItem?.item?.type === 'portal') return 'portal';
  if (worldItem?.minigameType) return 'chest';
  if (worldItem?.item?.type === 'bag') return 'bag';
  return 'item';
};

const getWorldItemAccent = (worldItem: any) => {
  const rarity = String(worldItem?.item?.rarity || '').toLowerCase();
  if (worldItem?.item?.type === 'portal') return '#a78bfa';
  if (rarity.includes('legend')) return '#f59e0b';
  if (rarity.includes('rare')) return '#60a5fa';
  if (rarity.includes('uncommon')) return '#34d399';
  return '#22d3ee';
};

interface PlaneSpriteProps {
  x: number;
  y: number;
  type: string;
  title?: string;
  icon?: string;
  accent?: string;
  size: number;
  onClick?: () => void;
}

const PlaneSprite: React.FC<PlaneSpriteProps> = ({ x, y, type, title, icon, accent = '#22d3ee', size, onClick }) => {
  const src = React.useMemo(() => {
    const texture = makeLootSpriteTexture(type, title, accent, icon);
    const canvas = texture.image as HTMLCanvasElement;
    const url = canvas.toDataURL('image/png');
    texture.dispose();
    return url;
  }, [type, title, accent, icon]);

  // Tăng chiều cao của hitbox lên gấp 2.5 lần để bù lại lực nén (squash)
  // do góc nghiêng (tilt) của camera, giúp người chơi dễ click hơn.
  const hitboxHeight = size * 2.5;

  return (
    <button
      type="button"
      className="absolute pointer-events-none border-0 bg-transparent p-0 flex flex-col justify-end items-center"
      style={{
        left: x,
        top: y,
        width: size,
        height: hitboxHeight,
        transform: `translate(-50%, calc(-100% + ${size / 2}px))`,
      }}
    >
      <span className="alin-map-billboard" style={{ display: 'block', width: '100%', height: size }}>
        <span
          className="block w-full alin-map-upright-sprite"
          style={{ height: size }}
        >
          <img src={src} alt={title || type} className="h-full w-full select-none object-contain drop-shadow-[0_10px_18px_rgba(2,8,23,0.35)]" draggable={false} />
        </span>
      </span>
    </button>
  );
};

const LooterMapPlaneLayer: React.FC<LooterMapPlaneLayerProps> = ({
  myObfPos,
  panX,
  panY,
  scale,
  planeYScale,
  boatTargetPin,
  boatOffsetX,
  boatOffsetY,
  onRequestMove,
  onStopBoat,
  onSetArrivalAction,
  planeScale = 1.8,
}) => {
  const viewport = useViewportSize();
  const currentPanX = useMotionSnapshot(panX);
  const currentPanY = useMotionSnapshot(panY);
  const visualScale = useMotionSnapshot(scale);
  const currentPlaneYScale = useMotionSnapshot(planeYScale);
  const currentBoatOffsetX = useMotionSnapshot(boatOffsetX);
  const currentBoatOffsetY = useMotionSnapshot(boatOffsetY);
  const looter = useLooterState();
  const actions = useLooterActions();
  const { state, worldItems, encounter } = looter;
  const planeSize = Math.max(viewport.width, viewport.height) * planeScale;

  const center = React.useMemo(() => {
    if (!myObfPos) return null;
    return getRoadmapCenterFromPan(myObfPos, currentPanX, currentPanY, currentPlaneYScale);
  }, [currentPanX, currentPanY, currentPlaneYScale, myObfPos]);

  const boatLatLng = React.useMemo<LatLng | null>(() => {
    if (!myObfPos) return null;
    return {
      lat: myObfPos.lat - currentBoatOffsetY / DEGREES_TO_PX,
      lng: myObfPos.lng + currentBoatOffsetX / DEGREES_TO_PX,
    };
  }, [currentBoatOffsetX, currentBoatOffsetY, myObfPos]);

  const safeWorldItems = React.useMemo(() => sanitizeWorldItems(worldItems), [worldItems]);
  const renderedWorldItems = React.useMemo(() => {
    if (encounter || !safeWorldItems.length) return [];
    const centerLat = state?.currentLat ?? myObfPos?.lat ?? 0;
    const centerLng = state?.currentLng ?? myObfPos?.lng ?? 0;
    const cullDeg = 3600 / 111000;

    return safeWorldItems
      .filter((item: any) => Math.abs(item.lat - centerLat) <= cullDeg && Math.abs(item.lng - centerLng) <= cullDeg)
      .slice(0, 28);
  }, [encounter, myObfPos?.lat, myObfPos?.lng, safeWorldItems, state?.currentLat, state?.currentLng]);

  const handleFortressClick = React.useCallback(() => {
    if (!boatLatLng || !state?.fortressLat || !state?.fortressLng) return;
    const target = { lat: state.fortressLat, lng: state.fortressLng };
    if (getDistanceMeters(boatLatLng.lat, boatLatLng.lng, target.lat, target.lng) <= 250) {
      onStopBoat?.();
      actions.openFortressStorage('fortress');
      return;
    }
    onSetArrivalAction?.(() => actions.openFortressStorage('fortress'));
    onRequestMove?.(target.lat, target.lng, 'fortress');
  }, [actions, boatLatLng, onRequestMove, onSetArrivalAction, onStopBoat, state?.fortressLat, state?.fortressLng]);

  const handleItemClick = React.useCallback((worldItem: any) => {
    if (!boatLatLng || !worldItem) return;
    const target = { lat: worldItem.lat, lng: worldItem.lng };
    const isPortal = worldItem?.item?.type === 'portal';
    const interact = () => {
      if (isPortal) {
        actions.openFortressStorage('portal');
      } else if (worldItem.minigameType) {
        actions.setShowMinigame({ ...worldItem, currentLat: boatLatLng.lat, currentLng: boatLatLng.lng });
      } else {
        actions.pickupItem(worldItem.spawnId, worldItem, boatLatLng.lat, boatLatLng.lng);
      }
    };

    if (getDistanceMeters(boatLatLng.lat, boatLatLng.lng, target.lat, target.lng) <= 250) {
      onStopBoat?.();
      interact();
      return;
    }

    onSetArrivalAction?.(interact);
    onRequestMove?.(target.lat, target.lng, 'item');
  }, [actions, boatLatLng, onRequestMove, onSetArrivalAction, onStopBoat]);

  if (!center || !boatLatLng) return null;

  const boatPos = projectToPlane(center, boatLatLng, visualScale, planeSize);
  const fortressPos = state?.fortressLat && state?.fortressLng
    ? projectToPlane(center, { lat: state.fortressLat, lng: state.fortressLng }, visualScale, planeSize)
    : null;
  const targetPos = boatTargetPin ? projectToPlane(center, boatTargetPin, visualScale, planeSize) : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      {!encounter && boatTargetPin && targetPos ? (
        <div className="absolute inset-0 z-[1]">
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            width={planeSize}
            height={planeSize}
            viewBox={`0 0 ${planeSize} ${planeSize}`}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="looter-target-path" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <line
              x1={boatPos.x}
              y1={boatPos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="url(#looter-target-path)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="12 10"
              className="animate-[dash_1.4s_linear_infinite]"
              opacity="0.92"
            />
            <circle
              cx={targetPos.x}
              cy={targetPos.y}
              r="18"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              opacity="0.35"
            />
            <circle
              cx={targetPos.x}
              cy={targetPos.y}
              r="6"
              fill="#ffffff"
              opacity="0.75"
            />
          </svg>
        </div>
      ) : null}

      {!encounter && fortressPos ? (
        <PlaneSprite
          x={fortressPos.x}
          y={fortressPos.y}
          type="fortress"
          title="Fortress"
          accent="#f59e0b"
          size={112}
          onClick={handleFortressClick}
        />
      ) : null}

      <PlaneSprite
        x={boatPos.x}
        y={boatPos.y}
        type="boat"
        title="You"
        accent="#38bdf8"
        size={72}
      />

      {!encounter && renderedWorldItems.map((item: any) => {
        const pos = projectToPlane(center, { lat: item.lat, lng: item.lng }, visualScale, planeSize);
        return (
          <PlaneSprite
            key={item.spawnId}
            x={pos.x}
            y={pos.y}
            type={getWorldItemType(item)}
            icon={getWorldItemIcon(item)}
            title={item?.item?.name || 'Loot'}
            accent={getWorldItemAccent(item)}
            size={54}
            onClick={() => handleItemClick(item)}
          />
        );
      })}
    </div>
  );
};

export default React.memo(LooterMapPlaneLayer);

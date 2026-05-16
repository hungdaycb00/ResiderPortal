import type { MotionValue } from 'framer-motion';
import type { LatLng } from '../sceneUtils';
import type { AdaptivePerformanceProfile } from '../../hooks/useAdaptivePerformance';
import type { AlinMapMode } from '../../constants';

/**
 * Props chung dùng cho cả AlinMapThreeScene (Canvas wrapper) và SceneContent.
 */
export interface AlinMapThreeSceneProps {
  position: [number, number] | null;
  myObfPos: { lat: number; lng: number } | null;
  nearbyUsers: any[];
  myUserId: string | null;
  user: any;
  myDisplayName: string;
  myAvatarUrl: string;
  myStatus: string;
  isVisibleOnMap: boolean;
  isSocketConnecting: boolean;
  isDesktop: boolean;
  currentProvince: string | null;
  galleryActive: boolean;
  galleryTitle: string;
  galleryImages: string[];
  searchTag: string;
  filterDistance: number;
  filterAgeMin: number;
  filterAgeMax: number;
  searchMarkerPos: LatLng | null;
  scale: MotionValue<number>;
  cameraZ: MotionValue<number>;
  tiltAngle: MotionValue<number>;
  planeYScale: MotionValue<number>;
  perspectivePx: number;
  cameraHeightOffset: number;
  cameraRotateDeg: number;
  cameraPitchOverride: number | null;
  cameraRotateYDeg: number;
  panX: MotionValue<number>;
  panY: MotionValue<number>;
  selfDragX: MotionValue<number>;
  selfDragY: MotionValue<number>;
  mapMode: AlinMapMode;
  isLooterGameMode?: boolean;
  useDomLooterLayer?: boolean;
  boatTargetPin?: LatLng | null;
  boatOffsetX?: MotionValue<number>;
  boatOffsetY?: MotionValue<number>;
  selectedUser?: any;
  onSelectUser?: (user: any) => void;
  onSelectSelf?: (user: any) => void;
  onRequestMove?: (lat: number, lng: number, source?: string) => void;
  onStopBoat?: () => void;
  onSelfDragEnd?: (newLat: number, newLng: number) => void;
  onSetArrivalAction?: (action: (() => void) | null) => void;
  setIsTierSelectorOpen?: (v: boolean) => void;
  cameraFov?: number;
  performance?: AdaptivePerformanceProfile;
}

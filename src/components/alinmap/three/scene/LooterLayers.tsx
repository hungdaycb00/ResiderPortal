import React from 'react';
import type { MotionValue } from 'framer-motion';
import ProceduralFortress from '../models/ProceduralFortress';
import LootSprite from '../models/LootSprite';
import DashedPath from '../models/DashedPath';
import { pxToScene, AVATAR_PLANE_SIZE, type LatLng } from '../sceneUtils';
import { GAME_CONFIG } from '../../looter-game/gameConfig';

interface LooterLayersProps {
  isLooterGameMode: boolean;
  encounter: any;
  sceneWorldScale: number;
  boatPosRef: React.MutableRefObject<[number, number, number]>;

  // Fortress
  looterStateObj: any;
  fortressScene: { x: number; z: number } | null;
  handleFortressClick: () => void;

  // Path
  boatTargetPin?: LatLng | null;
  boatTargetScene: { x: number; z: number } | null;

  // Items
  waypointRenderData: Array<{ item: any; pos: { x: number; z: number } }>;
  itemRenderData: Array<{ item: any; pos: { x: number; z: number } }>;
  getWorldItemType: (item: any) => string;
  getWorldItemIcon: (item: any) => string;
  getWorldItemAccent: (item: any) => string;
  handleWorldItemClick: (item: any) => void;
}

export default function LooterLayers({
  isLooterGameMode,
  encounter,
  sceneWorldScale,
  boatPosRef,
  looterStateObj,
  fortressScene,
  handleFortressClick,
  boatTargetPin,
  boatTargetScene,
  waypointRenderData,
  itemRenderData,
  getWorldItemType,
  getWorldItemIcon,
  getWorldItemAccent,
  handleWorldItemClick,
}: LooterLayersProps) {
  if (!isLooterGameMode) return null;

  const pxToScaledScene = (px: number) => pxToScene(px) * sceneWorldScale;
  const scalePos = (pos: { x: number; z: number }) => ({
    x: pos.x * sceneWorldScale,
    z: pos.z * sceneWorldScale,
  });

  return (
    <>
      {/* Fortress */}
      {!encounter && looterStateObj?.fortressLat && looterStateObj?.fortressLng ? (
        <ProceduralFortress position={[fortressScene!.x, 0, fortressScene!.z]} scale={20} onClick={handleFortressClick} />
      ) : null}

      {/* Waypoint items (3 gần nhất) */}
      {waypointRenderData.map(({ item, pos }: any) => {
        const scenePos = scalePos(pos);
        return (
          <LootSprite
            key={`wp-${item.spawnId}`}
            position={[scenePos.x, 3.5, scenePos.z]}
            type={getWorldItemType(item)}
            icon={getWorldItemIcon(item)}
            title={item?.item?.name || 'Loot'}
            accent={getWorldItemAccent(item)}
            scale={2.4}
            size={AVATAR_PLANE_SIZE * 2.0}
            renderOrder={50}
            onClick={() => handleWorldItemClick(item)}
          />
        );
      })}

      {/* Dashed path từ thuyền → target */}
      {!encounter && boatTargetPin && boatTargetScene ? (
        <DashedPath
          from={boatPosRef.current}
          to={[boatTargetScene.x, 5.0, boatTargetScene.z]}
          color="#22d3ee"
        />
      ) : null}

      {/* Boat target pin */}
      {!encounter && boatTargetPin ? (
        <LootSprite
          position={[boatTargetScene!.x, 5.02, boatTargetScene!.z]}
          type="target"
          size={AVATAR_PLANE_SIZE * 0.2}
          scale={2}
        />
      ) : null}

      {/* Enemy */}
      {encounter ? (
        <LootSprite
          position={[
            boatPosRef.current[0] + pxToScaledScene(GAME_CONFIG.COMBAT_ENEMY_BOAT_OFFSET_PX),
            0.7,
            boatPosRef.current[2],
          ]}
          type="enemy"
          scale={2.4 * GAME_CONFIG.COMBAT_BOAT_SCALE_MULTIPLIER}
        />
      ) : null}

      {/* World loot items */}
      {itemRenderData.map(({ item, pos }: any) => {
        const scenePos = scalePos(pos);
        return (
          <LootSprite
            key={item.spawnId}
            position={[scenePos.x, 3.0, scenePos.z]}
            type={getWorldItemType(item)}
            icon={getWorldItemIcon(item)}
            title={item?.item?.name || 'Loot'}
            accent={getWorldItemAccent(item)}
            scale={2}
            size={AVATAR_PLANE_SIZE * 1.8}
            renderOrder={40}
            onClick={() => handleWorldItemClick(item)}
          />
        );
      })}
    </>
  );
}

import React, { useEffect, useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import { makeBadgeTexture, MARKER_PLANE_SIZE } from './sceneUtils';

interface MarkerBillboardProps {
    position: [number, number, number];
    icon: string;
    label: string;
    accent?: string;
}

const MarkerBillboard: React.FC<MarkerBillboardProps> = ({ position, icon, label, accent = '#22d3ee' }) => {
    const texture = useMemo(() => makeBadgeTexture(icon, label, accent), [icon, label, accent]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    return (
        <Billboard follow position={position}>
            <mesh position={[0, 0.45, 0.08]} renderOrder={30}>
                <planeGeometry args={MARKER_PLANE_SIZE} />
                <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
            </mesh>
        </Billboard>
    );
};

export default React.memo(MarkerBillboard);

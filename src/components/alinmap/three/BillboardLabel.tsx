import { useEffect, useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import { makeBadgeTexture, LABEL_PLANE_SIZE } from './sceneUtils';

interface BillboardLabelProps {
    title: string;
    subtitle?: string;
    accent?: string;
    position: [number, number, number];
}

export default function BillboardLabel({ title, subtitle, accent, position }: BillboardLabelProps) {
    const texture = useMemo(() => makeBadgeTexture(title, subtitle, accent), [title, subtitle, accent]);

    useEffect(() => () => { texture.dispose(); }, [texture]);

    return (
        <Billboard follow lockX lockY lockZ position={position}>
            <mesh position={[0, 0, 0.1]} renderOrder={50}>
                <planeGeometry args={LABEL_PLANE_SIZE} />
                <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
            </mesh>
        </Billboard>
    );
}

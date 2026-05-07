export default function Ground({ mapMode }: { mapMode: 'grid' | 'satellite' }) {
    return (
        <group>
            <mesh rotation-x={-Math.PI / 2} position={[0, -1, 0]} receiveShadow>
                <planeGeometry args={[12000, 12000, 1, 1]} />
                <meshStandardMaterial
                    color={mapMode === 'satellite' ? '#02203a' : '#09141f'}
                    metalness={0.08}
                    roughness={1}
                    fog
                />
            </mesh>
            <gridHelper args={[12000, 120, '#164158', '#0f2436']} position={[0, -0.98, 0]} />
            <mesh rotation-x={-Math.PI / 2} position={[0, -0.96, 0]}>
                <planeGeometry args={[12000, 12000]} />
                <meshBasicMaterial
                    color={mapMode === 'satellite' ? '#0d3b66' : '#050b12'}
                    transparent
                    opacity={0.18}
                />
            </mesh>
        </group>
    );
}

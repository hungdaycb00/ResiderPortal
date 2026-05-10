import React, { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { SRGBColorSpace, NoToneMapping } from 'three';

import SceneContent from './scene/SceneContent';
import type { AlinMapThreeSceneProps } from './scene/types';

// Re-export props interface để các file đang import từ đây không cần thay đổi
export type { AlinMapThreeSceneProps };

// ─── Canvas Entry Point ───────────────────────────────────────────────────────
const AlinMapThreeScene: React.FC<AlinMapThreeSceneProps> = (props) => {
  return (
    <Canvas
      dpr={props.isDesktop ? [1, 1.5] : [0.85, 1]}
      frameloop="demand"
      shadows={false}
      gl={{
        antialias: props.isDesktop,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      }}
      camera={{ fov: 46, near: 0.5, far: 120000, position: [0, 1600, 2200] }}
      onCreated={({ gl }) => {
        gl.setClearColor('#071018', 1);
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = NoToneMapping;
        gl.toneMappingExposure = 1;
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, props.isDesktop ? 1.5 : 1));
      }}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[4000, 8000, 6000]} intensity={1.1} color="#dbeafe" />
      <directionalLight position={[-4000, 2000, -3000]} intensity={0.35} color="#22d3ee" />
      <Suspense
        fallback={
          <Html center>
            <div className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md">
              Loading Three.js scene...
            </div>
          </Html>
        }
      >
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
};

export default React.memo(AlinMapThreeScene);

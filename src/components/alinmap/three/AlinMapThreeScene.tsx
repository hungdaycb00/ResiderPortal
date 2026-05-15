import React, { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { SRGBColorSpace, NoToneMapping } from 'three';

import AlinMapLoadingIcon from '../components/AlinMapLoadingIcon';
import SceneContent from './scene/SceneContent';
import type { AlinMapThreeSceneProps } from './scene/types';

// Re-export props interface để các file đang import từ đây không cần thay đổi
export type { AlinMapThreeSceneProps };

// ─── Canvas Entry Point ───────────────────────────────────────────────────────
const AlinMapThreeScene: React.FC<AlinMapThreeSceneProps> = (props) => {
  const dprRange = props.performance?.dpr ?? (props.isDesktop ? [1, 1.5] : [0.85, 1]);
  const maxDpr = props.performance?.maxDevicePixelRatio ?? (props.isDesktop ? 1.5 : 1);
  const powerPreference = props.performance?.powerPreference ?? 'high-performance';
  const antialias = props.performance?.antialias ?? props.isDesktop;
  const isMinimalMode = props.performance?.mode === 'low';

  return (
    <Canvas
      className="absolute inset-0 z-[20]"
      dpr={dprRange}
      frameloop="demand"
      shadows={false}
      gl={{
        antialias,
        alpha: false,  // SPRINT 1: alpha compositing tốn ~15% GPU bandwidth
        powerPreference,
        preserveDrawingBuffer: false,
      }}
      camera={{ fov: props.cameraFov || 35, near: 0.5, far: 120000, position: [0, 1600, 2200] }}
      onCreated={({ gl }) => {
        // Màu nền Canvas — dùng màu trung tính để blend giữa roadmap (sáng) và satellite (tối)
        gl.setClearColor('#d8d8d4', 1);
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = NoToneMapping;
        gl.toneMappingExposure = 1;
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      }}
    >
      <ambientLight intensity={isMinimalMode ? 1.05 : 1.35} />
      <directionalLight position={[4000, 8000, 6000]} intensity={isMinimalMode ? 0.85 : 1.05} color="#dbeafe" />
      {!isMinimalMode && (
        <directionalLight position={[-4000, 2000, -3000]} intensity={0.28} color="#22d3ee" />
      )}
      <Suspense
        fallback={
          <Html center>
            <AlinMapLoadingIcon className="h-8 w-8 animate-spin text-white/35 drop-shadow-[0_0_14px_rgba(255,255,255,0.15)]" />
          </Html>
        }
      >
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
};

export default React.memo(AlinMapThreeScene);

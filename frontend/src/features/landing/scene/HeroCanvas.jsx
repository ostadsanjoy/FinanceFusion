import React, { Suspense, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import CoinScene from './CoinScene';

export default function HeroCanvas({ className = '', progress }) {
  const interaction = useRef({
    dragging: false,
    rotX: 0,
    rotY: 0,
    velX: 0,
    velY: 0,
    lastX: 0,
    lastY: 0,
  });

  const handlePointerDown = useCallback((e) => {
    const s = interaction.current;
    s.dragging = true;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.velX = 0;
    s.velY = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const s = interaction.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    const dy = e.clientY - s.lastY;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.velX = -dy * 0.0025;
    s.velY = dx * 0.0025;
    s.rotY += s.velY;
    s.rotX += s.velX;
  }, []);

  const endDrag = useCallback(() => {
    interaction.current.dragging = false;
  }, []);

  return (
    <div
      className={`${className} cursor-grab active:cursor-grabbing touch-none`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
    >
      <Canvas
        camera={{ position: [0, 0.1, 11], fov: 33 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <CoinScene interaction={interaction.current} progress={progress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
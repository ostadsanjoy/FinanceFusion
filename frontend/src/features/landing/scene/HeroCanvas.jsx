import React, { Suspense, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CoinScene from './CoinScene';


export default function HeroCanvas({ className = '', progress }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setPointer({ x, y });
  }, []);

  return (
    <div className={className} onPointerMove={handlePointerMove}>
      <Canvas
        camera={{ position: [0, 0.15, 9.5], fov: 32 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <CoinScene pointer={pointer} progress={progress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
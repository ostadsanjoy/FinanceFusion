import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const SLOT_POS = new THREE.Vector3(0.05, 1.0, 0.15);
const NUM_COINS = 6;

const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Where each coin settles once it's fallen through the slot, building a
// little pile at the bottom of the belly.
function restPosition(index) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return new THREE.Vector3(
    -0.42 + col * 0.42 + (row % 2 ? 0.18 : 0),
    -0.82 + row * 0.22,
    -0.15 + col * 0.14
  );
}

function PiggyBank({ bump }) {
  const bodyRef = useRef();

  useFrame((state) => {
    if (!bodyRef.current) return;
    const t = state.clock.getElapsedTime();
    const breathe = 1 + Math.sin(t * 0.6) * 0.008;
    const squish = 1 + bump.current * 0.08;
    bodyRef.current.scale.set(1.32 * breathe * (1 / squish), 1.02 * breathe * squish, 1.08 * breathe * (1 / squish));
  });

  const glassProps = {
    color: '#f7ecec',
    transparent: true,
    opacity: 0.22,
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  };

  return (
    <group>
      {/* body — glass shell so the coin pile inside is visible */}
      <mesh ref={bodyRef} renderOrder={2}>
        <sphereGeometry args={[1.15, 48, 48]} />
        <meshPhysicalMaterial {...glassProps} />
      </mesh>

      {/* snout */}
      <mesh position={[0, -0.08, 1.16]} rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.36, 0.4, 0.3, 28]} />
        <meshPhysicalMaterial {...glassProps} opacity={0.3} />
      </mesh>
      <mesh position={[-0.11, -0.08, 1.32]} renderOrder={3}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#c9a3a8" roughness={0.5} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.11, -0.08, 1.32]} renderOrder={3}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#c9a3a8" roughness={0.5} transparent opacity={0.6} />
      </mesh>

      {/* ears */}
      <mesh position={[-0.58, 0.98, 0.5]} rotation={[0.25, -0.5, 0.35]} renderOrder={2}>
        <coneGeometry args={[0.27, 0.42, 4]} />
        <meshPhysicalMaterial {...glassProps} />
      </mesh>
      <mesh position={[0.58, 0.98, 0.5]} rotation={[0.25, 0.5, -0.35]} renderOrder={2}>
        <coneGeometry args={[0.27, 0.42, 4]} />
        <meshPhysicalMaterial {...glassProps} />
      </mesh>

      {/* eyes */}
      <mesh position={[-0.42, 0.28, 0.98]} renderOrder={3}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.3} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0.42, 0.28, 0.98]} renderOrder={3}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.3} transparent opacity={0.75} />
      </mesh>

      {/* legs */}
      {[
        [-0.72, -1.08, 0.55],
        [0.72, -1.08, 0.55],
        [-0.72, -1.08, -0.55],
        [0.72, -1.08, -0.55],
      ].map((p, i) => (
        <mesh key={i} position={p} renderOrder={2}>
          <cylinderGeometry args={[0.17, 0.19, 0.36, 16]} />
          <meshPhysicalMaterial {...glassProps} opacity={0.3} />
        </mesh>
      ))}

      {/* curly tail */}
      <mesh position={[0, 0.55, -1.18]} rotation={[0.3, 0, 0]} renderOrder={2}>
        <torusGeometry args={[0.14, 0.035, 8, 24, Math.PI * 1.6]} />
        <meshPhysicalMaterial {...glassProps} opacity={0.3} />
      </mesh>

      {/* coin slot */}
      <mesh position={SLOT_POS.toArray()} rotation={[0, 0, 0.08]} renderOrder={3}>
        <boxGeometry args={[0.36, 0.05, 0.1]} />
        <meshStandardMaterial color="#3A2530" roughness={0.7} />
      </mesh>
    </group>
  );
}

function DepositCoin({ progress, index, bump }) {
  const ref = useRef();
  const start = useMemo(
    () => new THREE.Vector3(-3.4 + index * 0.1, 3.1 - index * 0.18, 0.6 + index * 0.12),
    [index]
  );
  const rest = useMemo(() => restPosition(index), [index]);

  const winStart = (index / NUM_COINS) * 0.85;
  const winEnd = winStart + 0.72 / NUM_COINS + 0.1;

  useFrame((state) => {
    if (!ref.current) return;
    const p = progress.current;
    let t = (p - winStart) / (winEnd - winStart);
    t = Math.min(Math.max(t, 0), 1);

    if (t < 0.55) {
      // flight into the slot
      const local = easeInOut(t / 0.55);
      const x = THREE.MathUtils.lerp(start.x, SLOT_POS.x, local);
      const z = THREE.MathUtils.lerp(start.z, SLOT_POS.z, local);
      const arc = Math.sin(local * Math.PI) * 1.5;
      const y = THREE.MathUtils.lerp(start.y, SLOT_POS.y, local) + arc;
      ref.current.position.set(x, y, z);
      ref.current.rotation.x = local * Math.PI * 5;
    } else {
      // falls through the slot and settles into the pile
      const local = easeOutCubic((t - 0.55) / 0.45);
      const x = THREE.MathUtils.lerp(SLOT_POS.x, rest.x, local);
      const y = THREE.MathUtils.lerp(SLOT_POS.y, rest.y, local);
      const z = THREE.MathUtils.lerp(SLOT_POS.z, rest.z, local);
      ref.current.position.set(x, y, z);
      const settle = (1 - local) * Math.PI * 3;
      ref.current.rotation.x = Math.PI * 5 + settle;
      ref.current.rotation.z = (1 - local) * 0.6;
    }

    if (t >= 0.5 && t <= 0.62) bump.local = Math.max(bump.local, Math.sin(((t - 0.5) / 0.12) * Math.PI));

    ref.current.visible = t > 0.02;
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} renderOrder={4}>
      <cylinderGeometry args={[0.16, 0.16, 0.035, 28]} />
      <meshStandardMaterial color="#EFCB7E" metalness={0.95} roughness={0.16} />
    </mesh>
  );
}

export default function CoinScene({ pointer, progress }) {
  const group = useRef();
  const bump = useRef(0);
  const bumpAccum = useRef({ local: 0 });

  useFrame(() => {
    if (!group.current) return;
    if (pointer) {
      const targetY = pointer.x * 0.16 - 0.3;
      const targetX = -pointer.y * 0.06 + 0.05;
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
    }
    bump.current += (bumpAccum.current.local - bump.current) * 0.25;
    bumpAccum.current.local *= 0.85;
  });

  return (
    <group ref={group} position={[1.1, -0.15, 0]} scale={0.62}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 5, 4]} intensity={1.3} color="#fff3dc" />
      <directionalLight position={[-4, -1, -3]} intensity={0.35} color="#8fce9c" />
      <pointLight position={[0, 1, 3]} intensity={0.5} color="#ffe3a3" />

      <PiggyBank bump={bump} />

      {Array.from({ length: NUM_COINS }).map((_, i) => (
        <DepositCoin key={i} progress={progress} index={i} bump={bumpAccum.current} />
      ))}

      <Sparkles count={25} scale={4.5} size={2} speed={0.2} color="#EFCB7E" opacity={0.4} position={[0, 0.5, 0]} />
    </group>
  );
}
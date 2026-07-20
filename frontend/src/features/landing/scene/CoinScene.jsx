import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';

const COIN_URL = '/models/coin/scene.gltf';
const PIGGY_URL = '/models/piggy/piggy.gltf';

const PER_LAYER = 8;
const LAYERS = 7;
const NUM_COINS = PER_LAYER * LAYERS;

const RAW = { halfWidth: 0.0427, height: 0.0887, halfDepth: 0.05 };

const PIGGY_SCALE_START = 70;
const PIGGY_SCALE_END = 57;
const GROUP_POS_START = new THREE.Vector3(4.5, -3.8, 0);
const GROUP_POS_END = new THREE.Vector3(3, -3.5, 0);
const PIGGY_SCALE = PIGGY_SCALE_END;

const BELLY = {
  floorY: RAW.height * PIGGY_SCALE * 0.14,
  halfFillY: RAW.height * PIGGY_SCALE * 0.52,
  slotY: RAW.height * PIGGY_SCALE * 0.9,
  slotZ: RAW.halfDepth * PIGGY_SCALE * 0.32,
  radius: Math.min(RAW.halfWidth, RAW.halfDepth) * PIGGY_SCALE * 0.52,
};

const COIN_DIAMETER = RAW.height * PIGGY_SCALE * 0.22;

const SLOT_POS = new THREE.Vector3(0, BELLY.slotY, BELLY.slotZ);

const TURN_END = 0.22;
const SIDE_ANGLE = -1.35;
const FRONT_ANGLE = 0.05;

const easeInOut = (t) => t * t * (3 - 2 * t);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const rand = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function pilePosition(i) {
  const layer = Math.floor(i / PER_LAYER);
  const slot = i % PER_LAYER;
  const angle = (slot / PER_LAYER) * Math.PI * 2 + layer * 0.6;
  const radius = BELLY.radius * (0.25 + rand(i) * 0.7);
  const layerHeight = (BELLY.halfFillY - BELLY.floorY) / LAYERS;
  const y = BELLY.floorY + layer * layerHeight + rand(i * 2.1) * layerHeight * 0.3;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius * 0.8 + BELLY.slotZ * 0.3
  );
}

function PiggyBank({ gltf, progress, turnRef }) {
  const wrapRef = useRef();

  useFrame((state) => {
    if (!wrapRef.current) return;
    const t = easeInOut(Math.min(Math.max(progress.current / TURN_END, 0), 1));
    const breathe = 1 + Math.sin(state.clock.getElapsedTime() * 0.6) * 0.006;
    const scale = THREE.MathUtils.lerp(PIGGY_SCALE_START, PIGGY_SCALE_END, t) * breathe;
    wrapRef.current.scale.setScalar(scale);
    turnRef.current = THREE.MathUtils.lerp(SIDE_ANGLE, FRONT_ANGLE, t);
  });

  return (
    <group ref={wrapRef} scale={PIGGY_SCALE_START}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function CoinField({ gltf, progress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const geometry = useMemo(() => {
    let geo = null;
    gltf.scene.traverse((child) => {
      if (child.isMesh && !geo) geo = child.geometry;
    });
    const cloned = geo.clone();
    cloned.computeBoundingBox();
    const box = cloned.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    cloned.translate(-center.x, -center.y, -center.z);
    cloned.rotateX(-Math.PI / 2);
    const size = new THREE.Vector3();
    box.getSize(size);
    const diameter = Math.max(size.x, size.y);
    const scale = COIN_DIAMETER / diameter;
    cloned.scale(scale, scale, scale);
    return cloned;
  }, [gltf]);

  const material = useMemo(() => {
    let mat = null;
    gltf.scene.traverse((child) => {
      if (child.isMesh && !mat) mat = child.material;
    });
    return mat;
  }, [gltf]);

  const starts = useMemo(
    () =>
      Array.from({ length: NUM_COINS }).map((_, i) => {
        const layer = Math.floor(i / PER_LAYER);
        return new THREE.Vector3(
          SLOT_POS.x - 4.2 + rand(i * 3.3) * 1.4,
          SLOT_POS.y + 3.2 + layer * 0.3 + rand(i * 5.1) * 0.4,
          SLOT_POS.z + 0.8 + rand(i * 7.7) * 0.6
        );
      }),
    []
  );
  const rests = useMemo(() => Array.from({ length: NUM_COINS }).map((_, i) => pilePosition(i)), []);
  const windows = useMemo(
    () =>
      Array.from({ length: NUM_COINS }).map((_, i) => {
        const layer = Math.floor(i / PER_LAYER);
        const slot = i % PER_LAYER;
        const start = layer * (0.72 / LAYERS) + slot * 0.01;
        return { start, end: start + 0.3 };
      }),
    []
  );

  useFrame(() => {
    if (!meshRef.current) return;
    const raw = progress.current;
    const p = Math.min(Math.max((raw - TURN_END) / (1 - TURN_END), 0), 1);

    for (let i = 0; i < NUM_COINS; i++) {
      const { start, end } = windows[i];
      let t = (p - start) / (end - start);
      t = Math.min(Math.max(t, 0), 1);

      if (t < 0.5) {
        const local = easeInOut(t / 0.5);
        const x = THREE.MathUtils.lerp(starts[i].x, SLOT_POS.x, local);
        const z = THREE.MathUtils.lerp(starts[i].z, SLOT_POS.z, local);
        const arc = Math.sin(local * Math.PI) * 1.8;
        const y = THREE.MathUtils.lerp(starts[i].y, SLOT_POS.y, local) + arc;
        dummy.position.set(x, y, z);
        dummy.rotation.set(local * Math.PI * 5, rand(i) * 6, 0);
      } else {
        const local = easeOutCubic((t - 0.5) / 0.5);
        dummy.position.lerpVectors(SLOT_POS, rests[i], local);
        const settle = (1 - local) * Math.PI * 2.5;
        dummy.rotation.set(Math.PI * 5 + settle, rand(i) * 6, (1 - local) * 0.8);
      }

      const s = t > 0.02 ? 1 : 0;
      dummy.scale.setScalar(s * (0.9 + rand(i * 1.7) * 0.2));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, NUM_COINS]} frustumCulled={false} />
  );
}

export default function CoinScene({ interaction, progress }) {
  const group = useRef();
  const turnRef = useRef(FRONT_ANGLE);
  const coinGltf = useGLTF(COIN_URL);
  const piggyGltf = useGLTF(PIGGY_URL);

  useFrame((state, delta) => {
    if (!group.current || !interaction) return;

    if (!interaction.dragging) {
      interaction.rotY += interaction.velY * delta * 30;
      interaction.rotX += interaction.velX * delta * 30;
      interaction.velX *= 0.92;
      interaction.velY *= 0.92;
      interaction.rotX = THREE.MathUtils.clamp(interaction.rotX, -0.5, 0.5);
    }

    group.current.rotation.y = turnRef.current + interaction.rotY;
    group.current.rotation.x = interaction.rotX;

    const t = easeInOut(Math.min(Math.max(progress.current / TURN_END, 0), 1));
    group.current.position.lerpVectors(GROUP_POS_START, GROUP_POS_END, t);
  });

  return (
    <group ref={group} position={GROUP_POS_START.toArray()}>
      <Environment preset="apartment" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 4]} intensity={1.1} color="#fff3dc" />
      <directionalLight position={[-4, -1, -3]} intensity={0.3} color="#8fce9c" />
      <pointLight position={[0, 1, 3]} intensity={0.4} color="#ffe3a3" />

      <PiggyBank gltf={piggyGltf} progress={progress} turnRef={turnRef} />
      <CoinField gltf={coinGltf} progress={progress} />

      <Sparkles
        count={20}
        scale={4}
        size={2}
        speed={0.2}
        color="#EFCB7E"
        opacity={0.35}
        position={[0, BELLY.slotY * 0.6, 0]}
      />
    </group>
  );
}

useGLTF.preload(COIN_URL);
useGLTF.preload(PIGGY_URL);
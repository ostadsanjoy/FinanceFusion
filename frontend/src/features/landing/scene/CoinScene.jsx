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
const PIGGY_SCALE_END = 60;
const PIGGY_SCALE = PIGGY_SCALE_END;

const GROUP_POS_START = new THREE.Vector3(4.5, -3.8, 0);
const GROUP_POS_END = new THREE.Vector3(3, -3.5, 0);
const GROUP_POS_FLIP = new THREE.Vector3(-GROUP_POS_START.x, GROUP_POS_START.y - 0.3, 0);

const BELLY = {
  floorY: RAW.height * PIGGY_SCALE * 0.14,
  halfFillY: RAW.height * PIGGY_SCALE * 0.52,
  slotY: RAW.height * PIGGY_SCALE * 0.9,
  slotZ: RAW.halfDepth * PIGGY_SCALE * 0.32,
  radius: Math.min(RAW.halfWidth, RAW.halfDepth) * PIGGY_SCALE * 0.52,
};

const COIN_DIAMETER = RAW.height * PIGGY_SCALE * 0.22;

const SLOT_POS = new THREE.Vector3(0, BELLY.slotY, BELLY.slotZ);

const TURN_END = 0.15;
const FILL_END = 1;
const SIDE_ANGLE = -1.35;
const FRONT_ANGLE = 0.05;

const FLIP_ANGLE = -SIDE_ANGLE;
const FLIP_GROUP_SCALE = PIGGY_SCALE_START / PIGGY_SCALE_END;
const MOVE_END = 0.85;
const DROP_COIN_APPEAR_START = 0.72;
const DROP_COIN_APPEAR_SPAN = 0.12;
const DROP_COIN_FALL_START = 0.87;
const DROP_COIN_FALL_SPAN = 0.13;
const DROP_COIN_HOVER = 0.9;
const DROP_COIN_HOVER_SCALE = 0.7;
const DROP_COIN_REST = new THREE.Vector3(0.15, BELLY.halfFillY + COIN_DIAMETER * 0.2, BELLY.slotZ * 0.3);

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const easeInOut = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const rand = (seed) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function pilePosition(i) {
  const t = i / (NUM_COINS - 1);
  const mound = 1 - t * 0.25;
  const angle = rand(i * 3.7) * Math.PI * 2;
  const radius = BELLY.radius * mound * (0.15 + rand(i * 5.3) * 0.95);
  const heightSpan = BELLY.halfFillY - BELLY.floorY;
  const y = BELLY.floorY + t * heightSpan + (rand(i * 9.1) - 0.5) * heightSpan * 0.22;
  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius * 0.8 + BELLY.slotZ * 0.3
  );
}

function useCoinAssets(gltf) {
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

  return { geometry, material };
}

function PiggyBank({ gltf, progress, flip, turnRef }) {
  const wrapRef = useRef();

  useFrame((state) => {
    if (!wrapRef.current) return;
    const t = easeInOut(clamp01(progress.current / TURN_END));
    const breathe = 1 + Math.sin(state.clock.getElapsedTime() * 0.6) * 0.006;
    const scale = THREE.MathUtils.lerp(PIGGY_SCALE_START, PIGGY_SCALE_END, t) * breathe;
    wrapRef.current.scale.setScalar(scale);
    const mirror = smoother(clamp01(flip.current / MOVE_END));
    const base = THREE.MathUtils.lerp(SIDE_ANGLE, FRONT_ANGLE, t);
    turnRef.current = THREE.MathUtils.lerp(base, FLIP_ANGLE, mirror);
  });

  return (
    <group ref={wrapRef} scale={PIGGY_SCALE_START}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function CoinField({ assets, progress }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

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
    const p = clamp01((raw - TURN_END) / (FILL_END - TURN_END));

    for (let i = 0; i < NUM_COINS; i++) {
      const { start, end } = windows[i];
      const t = clamp01((p - start) / (end - start));

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
        const decay = 1 - local;
        const restTiltX = (rand(i * 4.2) - 0.5) * 0.55;
        const restTiltZ = (rand(i * 6.6) - 0.5) * 0.5;
        const tumble = decay * Math.PI * 2.5 * (rand(i * 8.4) > 0.5 ? 1 : -1);
        dummy.rotation.set(Math.PI * 5 + restTiltX + tumble, rand(i) * 6, restTiltZ + decay * 0.8);
      }

      const s = t > 0.02 ? 1 : 0;
      dummy.scale.setScalar(s * (0.9 + rand(i * 1.7) * 0.2));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[assets.geometry, assets.material, NUM_COINS]}
      frustumCulled={false}
    />
  );
}

function DropCoin({ assets, flip }) {
  const meshRef = useRef();

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const f = flip.current;
    const appear = easeOutCubic(clamp01((f - DROP_COIN_APPEAR_START) / DROP_COIN_APPEAR_SPAN));
    const d = clamp01((f - DROP_COIN_FALL_START) / DROP_COIN_FALL_SPAN);
    const time = state.clock.getElapsedTime();

    mesh.visible = appear > 0.001;
    if (!mesh.visible) return;

    const parentYaw = mesh.parent ? mesh.parent.rotation.y : 0;
    mesh.rotation.order = 'YXZ';
    mesh.scale.setScalar(appear * THREE.MathUtils.lerp(DROP_COIN_HOVER_SCALE, 1, easeInOut(clamp01(d * 2))));

    if (d < 0.5) {
      const local = easeInOut(d / 0.5);
      const bob = Math.sin(time * 2.2) * 0.06 * (1 - local);
      mesh.position.set(
        SLOT_POS.x,
        THREE.MathUtils.lerp(SLOT_POS.y + DROP_COIN_HOVER, SLOT_POS.y, local) + bob,
        SLOT_POS.z
      );
      mesh.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, 0, local);
      mesh.rotation.y = Math.sin(time * 1.2) * 0.5 * (1 - local) - parentYaw * (1 - local) + local * Math.PI * 4;
    } else {
      const local = easeOutCubic((d - 0.5) / 0.5);
      mesh.position.lerpVectors(SLOT_POS, DROP_COIN_REST, local);
      mesh.rotation.x = 0;
      mesh.rotation.y = Math.PI * 4 + local * Math.PI;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={assets.geometry}
      material={assets.material}
      visible={false}
      frustumCulled={false}
    />
  );
}

export default function CoinScene({ interaction, progress, flip }) {
  const group = useRef();
  const turnRef = useRef(FRONT_ANGLE);
  const coinGltf = useGLTF(COIN_URL);
  const piggyGltf = useGLTF(PIGGY_URL);
  const coinAssets = useCoinAssets(coinGltf);

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

    const p = progress.current;
    const f = flip.current;
    const mv = smoother(clamp01(f / MOVE_END));
    group.current.scale.setScalar(THREE.MathUtils.lerp(1, FLIP_GROUP_SCALE, mv));
    if (f > 0) {
      group.current.position.lerpVectors(GROUP_POS_END, GROUP_POS_FLIP, mv);
    } else if (p <= TURN_END) {
      const t = easeInOut(clamp01(p / TURN_END));
      group.current.position.lerpVectors(GROUP_POS_START, GROUP_POS_END, t);
    } else {
      group.current.position.copy(GROUP_POS_END);
    }
  });

  return (
    <group ref={group} position={GROUP_POS_START.toArray()}>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 4]} intensity={1.1} color="#fff3dc" />
      <directionalLight position={[-4, -1, -3]} intensity={0.3} color="#8fce9c" />
      <pointLight position={[0, 1, 3]} intensity={0.4} color="#ffe3a3" />

      <PiggyBank gltf={piggyGltf} progress={progress} flip={flip} turnRef={turnRef} />
      <CoinField assets={coinAssets} progress={progress} />
      <DropCoin assets={coinAssets} flip={flip} />

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
"use client";

import * as React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

import {
  damp,
  pointerToTarget,
  scrollProgressFor,
  scrollScale,
} from "@/lib/hero-motion";

const ACCENT = "#64e3f0";
const VIOLET = "#a78bfa";

/** Damped pointer state lives in a ref — no React state updates per mouse move. */
function useDampedPointer() {
  const group = React.useRef<THREE.Group>(null);
  const scroll = React.useRef(0);
  const { pointer } = useThree();

  React.useEffect(() => {
    const onScroll = () => {
      scroll.current = scrollProgressFor(window.scrollY, window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    // Strength and range live in hero-motion.ts so they can be unit tested.
    const targetState = pointerToTarget(pointer.x, pointer.y, scroll.current);

    // Frame-rate independent damping keeps motion smooth and controlled.
    node.rotation.x = damp(node.rotation.x, targetState.rotationX, 4, delta);
    node.rotation.y = damp(node.rotation.y, targetState.rotationY, 4, delta);
    node.position.x = damp(node.position.x, targetState.offsetX, 3, delta);
    node.position.y = damp(node.position.y, targetState.offsetY, 3, delta);
    node.scale.setScalar(damp(node.scale.x, scrollScale(scroll.current), 3, delta));
  });

  return group;
}

function OrbitalRing({
  radius,
  rotation,
  color,
  speed,
  opacity,
}: {
  radius: number;
  rotation: [number, number, number];
  color: string;
  speed: number;
  opacity: number;
}) {
  const ref = React.useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * speed;
  });

  return (
    <mesh ref={ref} rotation={rotation}>
      <torusGeometry args={[radius, 0.0045, 8, 220]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

function ParticleField({ count = 620 }: { count?: number }) {
  const ref = React.useRef<THREE.Points>(null);

  const positions = React.useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      // Shell distribution so particles halo the artifact instead of filling it.
      const radius = 2.05 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[index * 3 + 1] = radius * Math.cos(phi) * 0.62;
      array[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return array;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.021;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={ACCENT}
        size={0.016}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Artifact() {
  const group = useDampedPointer();
  const core = React.useRef<THREE.Mesh>(null);
  const shell = React.useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    if (core.current) {
      core.current.rotation.y += delta * 0.06;
      core.current.rotation.x = Math.sin(elapsed * 0.24) * 0.06;
    }
    if (shell.current) {
      shell.current.rotation.y -= delta * 0.028;
      shell.current.rotation.z = Math.sin(elapsed * 0.18) * 0.08;
    }
  });

  return (
    <group ref={group}>
      {/* Inner artifact — smoked metal with a clear reflective coat. */}
      <mesh ref={core} castShadow receiveShadow>
        {/* Smooth, low-poly sphere: the faceted shell above supplies the detail. */}
        <sphereGeometry args={[1.18, 96, 96]} />
        <meshPhysicalMaterial
          color="#0d1a24"
          metalness={1}
          roughness={0.16}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1.5}
          iridescence={0.4}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 460]}
        />
      </mesh>

      {/* Thin shell that catches the rim light. */}
      <mesh ref={shell} scale={1.045}>
        <icosahedronGeometry args={[1.18, 1]} />
        <meshBasicMaterial
          color={ACCENT}
          wireframe
          transparent
          opacity={0.14}
          toneMapped={false}
        />
      </mesh>

      {/* Soft luminous core visible through the facets. */}
      <mesh scale={0.72}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0a2a33" transparent opacity={0.55} toneMapped={false} />
      </mesh>

      <OrbitalRing
        radius={1.92}
        rotation={[Math.PI / 2.35, 0.16, 0]}
        color={ACCENT}
        speed={0.09}
        opacity={0.42}
      />
      <OrbitalRing
        radius={2.34}
        rotation={[Math.PI / 1.75, -0.5, 0.3]}
        color={VIOLET}
        speed={-0.06}
        opacity={0.3}
      />

      <ParticleField />
    </group>
  );
}

/** Procedural environment: reflections with zero external downloads. */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={2.4} position={[-4, 3, 2]} scale={[6, 6, 1]} color="#cfe9ff" />
      <Lightformer intensity={1.5} position={[4, 1, -2]} scale={[5, 5, 1]} color="#3b6f88" />
      <Lightformer intensity={1.1} position={[0, -4, 3]} scale={[8, 3, 1]} color="#12222c" />
      <Lightformer
        form="ring"
        intensity={1.8}
        position={[2, 2, 4]}
        scale={2.4}
        color={ACCENT}
      />
      <Lightformer
        form="ring"
        intensity={1.2}
        position={[-3, -2, 2]}
        scale={2}
        color={VIOLET}
      />
    </Environment>
  );
}

export function HeroScene() {
  return (
    <>
      {/* No scene background: the canvas stays transparent so the cinematic
          CSS ground behind it remains visible. */}
      <fog attach="fog" args={["#080a0f", 7.5, 16]} />

      <ambientLight intensity={0.32} />
      <directionalLight position={[5, 6, 4]} intensity={1.5} color="#dff4ff" />
      <pointLight position={[-3.5, -1.5, 2.5]} intensity={18} color={ACCENT} distance={12} decay={2} />
      <pointLight position={[3.2, 2.4, -2]} intensity={12} color={VIOLET} distance={12} decay={2} />

      <StudioEnvironment />
      <Artifact />
    </>
  );
}

"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { HeroScene } from "@/components/3d/hero-scene";

/**
 * Optional GLB artifact. Point NEXT_PUBLIC_HERO_MODEL_URL at a licensed .glb in
 * Supabase Storage or /public to replace the procedural object. If the asset is
 * missing or fails to load, the procedural scene is used instead.
 */
function GltfArtifact({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = React.useRef<THREE.Group>(null);

  React.useEffect(() => {
    scene.traverse((child) => {
      if ((child as { isMesh?: boolean }).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

class ModelBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("[hero] GLB model failed, using procedural scene:", error);
  }

  override render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function HeroCanvas({
  paused = false,
  modelUrl,
}: {
  paused?: boolean;
  modelUrl?: string | null;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={paused ? "never" : "always"}
      camera={{ position: [0, 0, 6.4], fov: 38, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      {modelUrl ? (
        <ModelBoundary fallback={<HeroScene />}>
          <React.Suspense fallback={<HeroScene />}>
            <GltfArtifact url={modelUrl} />
          </React.Suspense>
        </ModelBoundary>
      ) : (
        <HeroScene />
      )}
    </Canvas>
  );
}

"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const HeroCanvas = dynamic(() => import("@/components/3d/hero-canvas"), {
  ssr: false,
  loading: () => <HeroVisualSkeleton />,
});

const MODEL_URL = process.env.NEXT_PUBLIC_HERO_MODEL_URL?.trim() || null;

/** If WebGL or the scene throws at runtime, fall back to the static artifact. */
class SceneBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("[hero] 3D scene failed, using static artifact:", error);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function HeroVisualSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative size-56 rounded-full border border-line/70 sm:size-72">
        <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_35%_28%,#1c3c48,#0a1119_70%)]" />
        <div className="absolute inset-0 animate-pulse rounded-full bg-accent/5" />
      </div>
    </div>
  );
}

/**
 * Designed stand-in used for reduced-motion visitors, small screens, missing
 * WebGL and as the static poster while the scene boots. It is deliberately
 * composed to match the 3D artifact so the hero never looks unfinished.
 */
function StaticArtifact() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative aspect-square w-[74%] max-w-[420px]">
        <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_34%_26%,#20404d_0%,#0e1a24_46%,#070c12_78%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_40px_120px_-40px_rgba(100,227,240,0.35)]" />
        <div className="absolute inset-[16%] rounded-full border border-white/5 bg-[conic-gradient(from_210deg_at_50%_50%,rgba(100,227,240,0.18),transparent_38%,rgba(167,139,250,0.16),transparent_72%,rgba(100,227,240,0.18))] mix-blend-screen" />
        <div className="absolute inset-[26%] rounded-full bg-[radial-gradient(circle_at_50%_60%,rgba(100,227,240,0.16),transparent_65%)] blur-md" />
        <div className="absolute inset-[2%] rounded-full border border-accent/20 [transform:rotateX(72deg)_rotateZ(18deg)]" />
        <div className="absolute inset-[-6%] rounded-full border border-violet/15 [transform:rotateX(66deg)_rotateZ(-24deg)]" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_58%,rgba(8,10,15,0.85)_76%)]" />
      </div>
    </div>
  );
}

type Capability = "pending" | "interactive" | "static";

function detectCapability(): Capability {
  if (typeof window === "undefined") return "static";
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";

    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection;
    if (connection?.saveData) return "static";
    if (connection?.effectiveType && /2g/.test(connection.effectiveType)) return "static";

    // Phones and small tablets get the lightweight treatment by design.
    if (window.innerWidth < 768) return "static";

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return "static";
    return "interactive";
  } catch {
    return "static";
  }
}

export function HeroVisual({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [capability, setCapability] = React.useState<Capability>("pending");
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    setCapability(detectCapability());

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resizeQuery = window.matchMedia("(min-width: 768px)");
    const recompute = () => setCapability(detectCapability());

    motionQuery.addEventListener("change", recompute);
    resizeQuery.addEventListener("change", recompute);
    return () => {
      motionQuery.removeEventListener("change", recompute);
      resizeQuery.removeEventListener("change", recompute);
    };
  }, []);

  // Pause the render loop when the hero scrolls out of view.
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      { threshold: 0.02 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="hero-visual"
      data-mode={capability}
    >
      {capability === "interactive" ? (
        <div className="absolute inset-0">
          <SceneBoundary fallback={<StaticArtifact />}>
            <HeroCanvas paused={!visible} modelUrl={MODEL_URL} />
          </SceneBoundary>
        </div>
      ) : (
        <StaticArtifact />
      )}
      {/* Vignette keeps the artifact from competing with the headline. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_35%,rgba(8,10,15,0.55)_78%,rgba(8,10,15,0.95)_100%)]" />
    </div>
  );
}

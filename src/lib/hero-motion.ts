/**
 * Pure helpers for the hero artifact's pointer response.
 *
 * Keeping the maths here makes the interaction testable without a WebGL
 * context, and guarantees the object never rotates or drifts beyond a bounded
 * range no matter how the pointer behaves.
 */

export const HERO_LIMITS = {
  rotationStrength: 0.32, // radians at the edge of the viewport
  parallax: 0.14, // world units of positional drift
  scrollLift: 0.5, // world units the artifact rises while scrolling
  scrollScale: 0.16, // how much it shrinks by the bottom of the hero
} as const;

export type PointerTarget = { rotationX: number; rotationY: number; offsetX: number; offsetY: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Maps normalised pointer coordinates (-1..1) and scroll progress (0..1) onto
 * bounded transform targets.
 */
export function pointerToTarget(
  pointerX: number,
  pointerY: number,
  scrollProgress = 0,
): PointerTarget {
  const px = clamp(pointerX, -1, 1);
  const py = clamp(pySafe(pointerY), -1, 1);
  const scroll = clamp(scrollProgress, 0, 1);

  return {
    rotationX: py * HERO_LIMITS.rotationStrength,
    rotationY: px * HERO_LIMITS.rotationStrength,
    offsetX: px * HERO_LIMITS.parallax,
    offsetY: py * HERO_LIMITS.parallax * 0.7 + scroll * HERO_LIMITS.scrollLift,
  };
}

function pySafe(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Frame-rate independent interpolation used by the render loop. */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Scale applied as the visitor scrolls past the hero. */
export function scrollScale(scrollProgress: number): number {
  const scroll = clamp(scrollProgress, 0, 1);
  return 1 - scroll * HERO_LIMITS.scrollScale;
}

/** Scroll progress within the first viewport height. */
export function scrollProgressFor(scrollY: number, viewportHeight: number): number {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  return clamp(scrollY / viewportHeight, 0, 1);
}

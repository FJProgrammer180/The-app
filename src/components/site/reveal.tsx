"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

let registered = false;
function registerGsap() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/**
 * Scroll-triggered reveal built on GSAP + ScrollTrigger.
 *
 * Native scrolling is never hijacked: elements simply fade/settle once as they
 * enter the viewport. When the visitor prefers reduced motion the content is
 * rendered immediately with no animation at all.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  staggerChildren = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    registerGsap();

    const targets = staggerChildren
      ? Array.from(element.querySelectorAll<HTMLElement>("[data-reveal-item]"))
      : [element];

    if (targets.length === 0) return;

    const context = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: 26,
        duration: 0.85,
        ease: "power3.out",
        stagger: staggerChildren ? 0.09 : 0,
        delay,
        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true,
        },
        // Leave the DOM in its natural state once the animation completes.
        clearProps: "opacity,transform",
      });
    }, element);

    return () => context.revert();
  }, [delay, staggerChildren]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}

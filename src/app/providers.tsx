"use client";
import { useSyncExternalStore } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: reduced ? 1 : 0.1,
        smoothWheel: !reduced,
      }}
    >
      {children}
    </ReactLenis>
  );
}

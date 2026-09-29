"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/app/providers";

// Remember each card's old position, then gently move it to its new ranked position.
export function ResultGrid({ children }: { children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const previousWidth = useRef(0);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const next = new Map<string, { x: number; y: number }>();
    const animations: Animation[] = [];
    const width = grid.current?.clientWidth ?? 0;
    const resized = width !== previousWidth.current;
    for (const card of grid.current?.querySelectorAll<HTMLElement>(
      "[data-movie-id]",
    ) ?? []) {
      const id = card.dataset.movieId!;
      const bounds = card.getBoundingClientRect();
      const rect = {
        x: bounds.left + window.scrollX,
        y: bounds.top + window.scrollY,
      };
      const previous = positions.current.get(id);
      next.set(id, rect);
      if (
        !reduced &&
        !resized &&
        previous &&
        (previous.x !== rect.x || previous.y !== rect.y)
      ) {
        animations.push(
          card.animate(
            [
              {
                transform: `translate(${previous.x - rect.x}px, ${previous.y - rect.y}px)`,
              },
              { transform: "translate(0, 0)" },
            ],
            { duration: 280, easing: "ease-out" },
          ),
        );
      }
    }
    positions.current = next;
    previousWidth.current = width;
    return () => animations.forEach((animation) => animation.cancel());
  }, [children, reduced]);
  return (
    <div ref={grid} className="movie-grid result-grid">
      {children}
    </div>
  );
}

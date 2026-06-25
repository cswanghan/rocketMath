import { useCallback, useEffect, useRef } from 'react';

// Pointer-parallax for the scattered-card hero (Kinetic-style).
// Sets CSS vars --mx/--my (normalized -1..1 from container center) on the
// container; CSS composes each card's translate + 3D tilt from those vars.
// Writes happen inside rAF and via refs, so there are zero React re-renders.
export function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const raf = useRef(0);

  const set = useCallback((mx: number, my: number) => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    });
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (e.pointerType === 'touch') return; // touch scroll shouldn't tilt
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      set(Math.max(-1, Math.min(1, mx)), Math.max(-1, Math.min(1, my)));
    },
    [set],
  );

  const onPointerLeave = useCallback(() => set(0, 0), [set]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { ref, onPointerMove, onPointerLeave };
}

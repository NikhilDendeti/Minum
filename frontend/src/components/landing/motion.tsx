import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

// Scroll motion for the landing page. Everything here is progressive: with reduced motion, no IntersectionObserver, or
// before hydration, content simply shows in its final state. Only opacity and transform are ever animated.

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** True once the element has been scrolled into view (and stays true). */
export function useInView<T extends HTMLElement>(threshold = 0.25, rootMargin = "0px 0px -8% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold, rootMargin]);
  return [ref, seen] as const;
}

/** Fades and lifts its children in once, in reading order (use `delay` to stagger siblings). */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLElement>(0.15);
  return (
    <Tag ref={ref} className={`reveal ${seen ? "is-in" : ""} ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

/** Counts from 0 to `to` once when it scrolls into view. The final figure is always the real one. */
export function CountUp({ to, format, ms = 1100 }: { to: number; format: (n: number) => string; ms?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5);
  const [value, setValue] = useState(prefersReducedMotion() ? to : 0);
  useEffect(() => {
    if (!seen || prefersReducedMotion()) {
      if (seen) setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, ms]);
  return (
    <span ref={ref} className="num" aria-label={format(to)}>
      <span aria-hidden>{format(value)}</span>
    </span>
  );
}

/** Types `text` out once `active` turns true. Without motion the whole text is there straight away. */
export function useTyped(text: string, active: boolean, msPerChar = 38) {
  const calm = prefersReducedMotion();
  const [n, setN] = useState(calm ? text.length : 0);
  useEffect(() => {
    if (calm) {
      setN(text.length);
      return;
    }
    if (!active) return;
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [text, active, msPerChar, calm]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

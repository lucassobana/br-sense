import { useEffect, useRef } from "react";

export function useAutoScroll(speed = 0.5) {
  const ref = useRef<HTMLDivElement>(null);
  const exactScroll = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let animationId: number;
    let isPaused = false;

    const pause = () => {
      isPaused = true;
    };
    const play = () => {
      isPaused = false;
      exactScroll.current = el.scrollLeft;
    };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", play);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", play);

    const scroll = () => {
      if (!isPaused && el.scrollWidth > el.clientWidth) {
        exactScroll.current += speed;

        const firstChild = el.children[0] as HTMLElement;
        const firstGroupWidth = firstChild
          ? firstChild.getBoundingClientRect().width
          : el.scrollWidth / 2;

        if (exactScroll.current >= firstGroupWidth) {
          exactScroll.current -= firstGroupWidth;
        }

        const maxScroll = el.scrollWidth - el.clientWidth;
        if (exactScroll.current > maxScroll) {
          exactScroll.current = 0;
        }

        el.scrollLeft = exactScroll.current;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", play);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", play);
    };
  }, [speed]);

  return ref;
}

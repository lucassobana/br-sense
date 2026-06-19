import { useEffect, useRef } from "react";

export function useAutoScroll(speed = 0.1) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let animationId: number;
    let isPaused = false;

    // Pausa a animação quando o utilizador interage
    const pause = () => {
      isPaused = true;
    };
    const play = () => {
      isPaused = false;
    };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", play);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", play);

    const scroll = () => {
      // Só desliza se não estiver em pausa e se houver espaço para scroll
      if (!isPaused && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += speed;

        // Se chegar ao fim do scroll, volta ao início suavemente
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0;
        }
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

import { useEffect, useState } from "react";

export function useScrollToTop(
  ref: React.RefObject<HTMLDivElement | null>,
  threshold = 300,
) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > threshold);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref, threshold]);

  return showScrollTop;
}

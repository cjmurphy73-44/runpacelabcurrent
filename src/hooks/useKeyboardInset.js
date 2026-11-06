import { useEffect, useState } from "react";

// Returns the current on-screen keyboard height in px (0 on desktop or when it is closed).
// Derived from the visual viewport, which shrinks when a mobile keyboard opens while
// window.innerHeight keeps reporting the full screen.
export default function useKeyboardInset(threshold = 80) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(gap > threshold ? Math.round(gap) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [threshold]);

  return inset;
}
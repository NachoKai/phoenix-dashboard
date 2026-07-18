import { useEffect } from "react";

export function useOrientationLock(orientation: string | undefined) {
  useEffect(() => {
    if (!orientation || orientation === "auto") {
      (screen.orientation as any)?.unlock?.();
      return;
    }
    const so = screen.orientation as any;
    if (!so?.lock) return;

    const lockOrientation = () => {
      so.lock(orientation).catch(() => {});
    };

    if (document.fullscreenElement) {
      lockOrientation();
    } else {
      document.documentElement
        .requestFullscreen()
        .then(lockOrientation)
        .catch(() => {});
    }
  }, [orientation]);
}

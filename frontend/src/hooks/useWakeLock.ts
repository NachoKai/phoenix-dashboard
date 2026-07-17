import { useEffect, useRef } from "react";

export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    async function request() {
      try {
        sentinelRef.current = await navigator.wakeLock.request("screen");
        sentinelRef.current.addEventListener("release", () => {
          sentinelRef.current = null;
        });
      } catch {
        console.error("[wakeLock] Wake lock request failed");
        // Wake lock request failed (e.g. permissions policy, not supported)
      }
    }

    async function onVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        await request();
      }
    }

    request();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, []);
}

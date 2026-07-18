import { useEffect } from "react";
import type { GlobalSettings } from "../types";
import { isInSleepRange } from "../utils/time";

export function useSleepMode(
  globalSettings: GlobalSettings | undefined,
  setSleeping: (v: boolean) => void,
) {
  useEffect(() => {
    if (!globalSettings?.sleepTimeEnabled) {
      setSleeping(false);
      return;
    }

    const check = () => setSleeping(isInSleepRange(globalSettings));

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [globalSettings, setSleeping]);
}

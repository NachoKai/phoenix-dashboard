import { useEffect } from "react";

export function useAutoDismiss(
  value: string | null,
  onDismiss: () => void,
  timeout = 4000,
) {
  useEffect(() => {
    if (!value) return;
    const t = setTimeout(onDismiss, timeout);
    return () => clearTimeout(t);
  }, [value, onDismiss, timeout]);
}

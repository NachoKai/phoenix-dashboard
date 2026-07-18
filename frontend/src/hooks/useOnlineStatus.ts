import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getDeviceId } from "../utils/deviceId";

export function useOnlineStatus(online: boolean, setOnline: (v: boolean) => void) {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline]);

  useEffect(() => {
    if (online) {
      queryClient.invalidateQueries({ queryKey: ["dashboard", deviceId] });
    }
  }, [online, deviceId, queryClient]);
}

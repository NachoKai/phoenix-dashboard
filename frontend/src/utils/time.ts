import type { GlobalSettings } from "../types";

export function isInSleepRange(settings: GlobalSettings): boolean {
  if (!settings.sleepTimeEnabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = settings.sleepStartHour * 60 + settings.sleepStartMinute;
  const endMinutes = settings.sleepEndHour * 60 + settings.sleepEndMinute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

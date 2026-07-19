import type { GlobalSettings } from "../types";

export function isInSleepRange(settings: GlobalSettings): boolean {
  if (!settings.sleepTimeEnabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const today = now.getDay();
  const override = settings.sleepTimeDayOverrides?.[today];

  const startHour = override?.sleepStartHour ?? settings.sleepStartHour;
  const startMinute = override?.sleepStartMinute ?? settings.sleepStartMinute;
  const endHour = override?.sleepEndHour ?? settings.sleepEndHour;
  const endMinute = override?.sleepEndMinute ?? settings.sleepEndMinute;

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

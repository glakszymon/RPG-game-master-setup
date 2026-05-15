/*
 * useLunarPhase — computes lunar phase for a given date.
 *
 * Uses modular arithmetic against a reference "new moon" day.
 * Returns one of 8 named phases with an emoji icon.
 */

import { useMemo } from 'react';
import type { CalendarConfig } from '../../../canvas/types';

export const LUNAR_PHASES = [
  { name: 'New Moon', icon: '🌑' },
  { name: 'Waxing Crescent', icon: '🌒' },
  { name: 'First Quarter', icon: '🌓' },
  { name: 'Waxing Gibbous', icon: '🌔' },
  { name: 'Full Moon', icon: '🌕' },
  { name: 'Waning Gibbous', icon: '🌖' },
  { name: 'Last Quarter', icon: '🌗' },
  { name: 'Waning Crescent', icon: '🌘' },
] as const;

/** Get the absolute day number from a date (year * daysPerYear + daysBefore + day). */
function getAbsoluteDay(
  day: number,
  monthIndex: number,
  year: number,
  months: Array<{ days: number }>,
): number {
  const daysPerYear = months.reduce((s, m) => s + m.days, 0);
  let daysBefore = 0;
  for (let i = 0; i < monthIndex; i++) daysBefore += months[i].days;
  return (year - 1) * daysPerYear + daysBefore + day;
}

export function computeLunarPhase(
  day: number,
  monthIndex: number,
  year: number,
  calendar: CalendarConfig,
): { name: string; icon: string; phaseIndex: number } | null {
  const cycleLength = calendar.lunarCycleLength;
  const referenceDay = calendar.lunarReferenceDay ?? 0;
  if (!cycleLength || cycleLength <= 0) return null;

  const absDay = getAbsoluteDay(day, monthIndex, year, calendar.months);
  const phase = ((absDay - referenceDay) % cycleLength + cycleLength) % cycleLength;
  const normalized = phase / cycleLength; // 0 = new moon, 0.5 = full moon
  const phaseIndex = Math.floor(normalized * 8) % 8;

  return {
    name: LUNAR_PHASES[phaseIndex].name,
    icon: LUNAR_PHASES[phaseIndex].icon,
    phaseIndex,
  };
}

/** Hook wrapper: returns lunar phase for the current day. */
export function useLunarPhase(
  day: number,
  monthIndex: number,
  year: number,
  calendar: CalendarConfig,
) {
  return useMemo(
    () => computeLunarPhase(day, monthIndex, year, calendar),
    [day, monthIndex, year, calendar],
  );
}

/*
 * useDaylightTimes — cosine interpolation for solstice-based dawn/dusk.
 *
 * When Advanced calendar mode is active and solstice data is configured,
 * returns computed dawn/dusk hours that override the manual Clock settings.
 * Uses cosine curve: slow change near solstices, fast near equinoxes.
 */

import { useMemo } from 'react';
import type { CalendarConfig } from '../../../canvas/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Compute dawn/dusk for a given date using solstice interpolation. */
export function computeDaylightTimes(
  day: number,
  monthIndex: number,
  _year: number,
  calendar: CalendarConfig,
): { dawn: number; dusk: number } | null {
  const { summerSolstice, winterSolstice, months } = calendar;
  if (!summerSolstice || !winterSolstice) return null;

  const daysPerYear = months.reduce((s, m) => s + m.days, 0);
  if (daysPerYear <= 0) return null;

  // Current day-of-year (0-based)
  let currentDOY = 0;
  for (let i = 0; i < monthIndex; i++) currentDOY += months[i].days;
  currentDOY += day - 1;

  // Winter solstice day-of-year
  let winterDOY = 0;
  for (let i = 0; i < winterSolstice.month; i++) winterDOY += months[i].days;
  winterDOY += winterSolstice.day - 1;

  // Distance from winter solstice, wrapped to [0, daysPerYear)
  const dist = ((currentDOY - winterDOY) % daysPerYear + daysPerYear) % daysPerYear;

  // Cosine interpolation: 0 at winter solstice, 1 at summer solstice
  const yearProgress = dist / daysPerYear;
  const t = (1 - Math.cos(yearProgress * 2 * Math.PI)) / 2;

  return {
    dawn: lerp(winterSolstice.dawnHour, summerSolstice.dawnHour, t),
    dusk: lerp(winterSolstice.duskHour, summerSolstice.duskHour, t),
  };
}

/** Hook wrapper. Returns null if solstice data not configured. */
export function useDaylightTimes(
  day: number,
  monthIndex: number,
  year: number,
  calendar: CalendarConfig,
) {
  return useMemo(
    () => computeDaylightTimes(day, monthIndex, year, calendar),
    [day, monthIndex, year, calendar],
  );
}

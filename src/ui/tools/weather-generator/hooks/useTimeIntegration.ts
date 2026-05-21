/*
 * useTimeIntegration — derives time-of-day and season from CampaignTimeState.
 */

import { useMemo } from 'react';
import type { CampaignTimeState } from '../../../canvas/types';
import type { TimeOfDay, Season } from '../types';

export interface DerivedTime {
  timeOfDay: TimeOfDay;
  season: Season;
}

/** Derive time-of-day from hour and dawn/dusk settings */
function deriveTimeOfDay(hour: number, dawnHour: number, duskHour: number): TimeOfDay {
  if (hour >= dawnHour - 1 && hour < dawnHour + 1) return 'dawn';
  if (hour >= dawnHour + 1 && hour < duskHour - 1) return 'day';
  if (hour >= duskHour - 1 && hour < duskHour + 1) return 'dusk';
  return 'night';
}

/** Derive season from month (0-indexed) and total months count */
function deriveSeason(month: number, totalMonths: number): Season {
  const ratio = month / totalMonths;
  if (ratio < 0.25) return 'spring';
  if (ratio < 0.5) return 'summer';
  if (ratio < 0.75) return 'autumn';
  return 'winter';
}

export function useTimeIntegration(timeState: CampaignTimeState | undefined): DerivedTime | null {
  return useMemo(() => {
    if (!timeState) return null;

    const timeOfDay = deriveTimeOfDay(
      timeState.currentHour,
      timeState.dawnHour,
      timeState.duskHour,
    );

    const totalMonths = timeState.calendar.months.length;
    const season = deriveSeason(timeState.currentMonth, totalMonths);

    return { timeOfDay, season };
  }, [timeState]);
}

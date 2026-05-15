/*
 * useCalendarGrid — builds the month grid for rendering.
 *
 * Pure computation: given month config and week length,
 * returns a 2D array of day cells (null for padding).
 */

import { useMemo } from 'react';
import type { CalendarConfig } from '../../../canvas/types';

export interface DayCell {
  day: number;
  isHoliday: boolean;
  holidayName?: string;
  holidayColor?: string;
}

export type GridRow = Array<DayCell | null>;

/** Build the grid for a given month. */
export function buildMonthGrid(
  calendar: CalendarConfig,
  monthIndex: number,
  year: number,
): GridRow[] {
  const months = calendar.months;
  if (monthIndex < 0 || monthIndex >= months.length) return [];

  const weekLength = calendar.weekDays.length || 7;
  const daysInMonth = months[monthIndex].days;

  // Offset: total days before this month in the year, mod weekLength
  let totalDaysBefore = 0;
  for (let i = 0; i < monthIndex; i++) {
    totalDaysBefore += months[i].days;
  }
  // Add year offset so different years don't all start on the same weekday
  const daysPerYear = months.reduce((s, m) => s + m.days, 0);
  const yearOffset = (year - 1) * daysPerYear;
  const startOffset = (totalDaysBefore + yearOffset) % weekLength;

  // Holidays lookup for this month
  const holidayMap = new Map<number, { name: string; color?: string }>();
  for (const h of calendar.holidays) {
    if (h.month === monthIndex) {
      holidayMap.set(h.day, { name: h.name, color: h.color });
    }
  }

  const rows: GridRow[] = [];
  let currentDay = 1;

  const totalCells = startOffset + daysInMonth;
  const totalRows = Math.ceil(totalCells / weekLength);

  for (let row = 0; row < totalRows; row++) {
    const cells: GridRow = [];
    for (let col = 0; col < weekLength; col++) {
      const cellIndex = row * weekLength + col;
      if (cellIndex < startOffset || currentDay > daysInMonth) {
        cells.push(null);
      } else {
        const holiday = holidayMap.get(currentDay);
        cells.push({
          day: currentDay,
          isHoliday: !!holiday,
          holidayName: holiday?.name,
          holidayColor: holiday?.color,
        });
        currentDay++;
      }
    }
    rows.push(cells);
  }

  return rows;
}

/** Hook wrapper with memoization. */
export function useCalendarGrid(
  calendar: CalendarConfig,
  monthIndex: number,
  year: number,
) {
  return useMemo(
    () => buildMonthGrid(calendar, monthIndex, year),
    [calendar, monthIndex, year],
  );
}

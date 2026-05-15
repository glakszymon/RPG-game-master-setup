/*
 * CalendarGrid — renders a month grid with weekday headers,
 * day cells, holiday dots with tooltips, and current-day highlight.
 */

import { memo } from 'react';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { useCalendarGrid } from './hooks/useCalendarGrid';
import styles from './TimeCalendar.module.css';
import type { CalendarConfig } from '../../canvas/types';

interface CalendarGridProps {
  calendar: CalendarConfig;
  viewingMonth: number;
  viewingYear: number;
  currentDay: number;
  currentMonth: number;
  currentYear: number;
}

const DayCell = memo(function DayCell({
  day,
  isCurrent,
  isHoliday,
  holidayName,
  holidayColor,
}: {
  day: number;
  isCurrent: boolean;
  isHoliday: boolean;
  holidayName?: string;
  holidayColor?: string;
}) {
  const cell = (
    <div className={`${styles.dayCell} ${isCurrent ? styles.currentDay : ''}`}>
      <span className={styles.dayNumber}>{day}</span>
      <div className={styles.dayCellIcons}>
        {isHoliday && (
          <span
            className={styles.holidayDot}
            style={holidayColor ? { background: holidayColor } : undefined}
          />
        )}
      </div>
    </div>
  );

  if (isHoliday && holidayName) {
    return <Tooltip content={holidayName} side="top">{cell}</Tooltip>;
  }
  return cell;
});

export const CalendarGrid = memo(function CalendarGrid({
  calendar,
  viewingMonth,
  viewingYear,
  currentDay,
  currentMonth,
  currentYear,
}: CalendarGridProps) {
  const grid = useCalendarGrid(calendar, viewingMonth, viewingYear);
  const weekDays = calendar.weekDays;
  const weekLength = weekDays.length || 7;
  const isCurrentMonth = viewingMonth === currentMonth && viewingYear === currentYear;

  return (
    <div className={styles.gridWrapper}>
      {/* Weekday headers */}
      <div
        className={styles.weekdayRow}
        style={{ gridTemplateColumns: `repeat(${weekLength}, 1fr)` }}
      >
        {weekDays.map((wd, i) => (
          <div key={i} className={styles.weekdayHeader}>{wd}</div>
        ))}
      </div>

      {/* Day grid */}
      <div
        className={styles.dayGrid}
        style={{ gridTemplateColumns: `repeat(${weekLength}, 1fr)` }}
      >
        {grid.flatMap((row, ri) =>
          row.map((cell, ci) => {
            if (!cell) {
              return <div key={`${ri}-${ci}`} className={styles.emptyCell} />;
            }
            return (
              <DayCell
                key={cell.day}
                day={cell.day}
                isCurrent={isCurrentMonth && cell.day === currentDay}
                isHoliday={cell.isHoliday}
                holidayName={cell.holidayName}
                holidayColor={cell.holidayColor}
              />
            );
          }),
        )}
      </div>
    </div>
  );
});

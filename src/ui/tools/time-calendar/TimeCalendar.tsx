/*
 * TimeCalendar — monthly calendar view with navigation,
 * holiday display, and settings for calendar configuration.
 *
 * Supports seasonal daylight adjustment: when enabled, dawn/dusk
 * hours are automatically interpolated between summer and winter
 * solstice values using cosine curve.
 */

import { useCallback, useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { useDaylightTimes } from './hooks/useDaylightTimes';
import { Modal } from '../../components/Modal/Modal';
import { Button } from '../../components/Button/Button';
import styles from './TimeCalendar.module.css';
import type { CampaignTimeState, CalendarConfig } from '../../canvas/types';

interface TimeCalendarProps {
  timeState: CampaignTimeState;
  onAdvanceTime: (minutes: number) => void;
  onSetTimeState: (timeState: CampaignTimeState) => void;
}

export function TimeCalendar({
  timeState,
  onSetTimeState,
}: TimeCalendarProps) {
  const { currentDay, currentMonth, currentYear, calendar, calendarMode } = timeState;

  // Local viewing state — offset from current date
  const [monthOffset, setMonthOffset] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Compute the viewed month/year from current + offset
  const totalMonths = calendar.months.length;
  let viewMonth = currentMonth + monthOffset;
  let viewYear = currentYear;
  while (viewMonth >= totalMonths) { viewMonth -= totalMonths; viewYear++; }
  while (viewMonth < 0) { viewMonth += totalMonths; viewYear--; }

  // Navigation
  const goNextMonth = useCallback(() => {
    setMonthOffset((o) => o + 1);
  }, []);

  const goPrevMonth = useCallback(() => {
    setMonthOffset((o) => o - 1);
  }, []);

  const goToday = useCallback(() => {
    setMonthOffset(0);
  }, []);

  // Seasonal daylight override
  const daylightOverride = useDaylightTimes(
    currentDay, currentMonth, currentYear, calendar,
  );

  // Apply seasonal dawn/dusk if advanced mode + solstice configured
  useEffect(() => {
    if (calendarMode !== 'advanced' || !daylightOverride) return;
    const newDawn = Math.round(daylightOverride.dawn * 10) / 10;
    const newDusk = Math.round(daylightOverride.dusk * 10) / 10;
    if (
      Math.abs(timeState.dawnHour - newDawn) > 0.05 ||
      Math.abs(timeState.duskHour - newDusk) > 0.05
    ) {
      onSetTimeState({ ...timeState, dawnHour: newDawn, duskHour: newDusk });
    }
  }, [calendarMode, daylightOverride, timeState, onSetTimeState]);

  const monthName = calendar.months[viewMonth]?.name ?? `Month ${viewMonth + 1}`;
  const isViewingCurrent = monthOffset === 0;
  const hasSeasonal = calendarMode === 'advanced' && !!calendar.summerSolstice && !!calendar.winterSolstice;

  // ── Settings state ──
  const [editMode, setEditMode] = useState(calendarMode);
  const [editMonths, setEditMonths] = useState(
    () => calendar.months.map((m) => ({ ...m })),
  );
  const [editWeekDays, setEditWeekDays] = useState(() => [...calendar.weekDays]);

  // Holiday editor
  const [editHolidays, setEditHolidays] = useState(
    () => calendar.holidays.map((h) => ({ ...h })),
  );
  const [newHolMonth, setNewHolMonth] = useState('0');
  const [newHolDay, setNewHolDay] = useState('1');
  const [newHolName, setNewHolName] = useState('');

  // Seasonal daylight editor
  const [editSummerSolstice, setEditSummerSolstice] = useState(
    () => calendar.summerSolstice ?? { month: 5, day: 21, dawnHour: 5, duskHour: 21 },
  );
  const [editWinterSolstice, setEditWinterSolstice] = useState(
    () => calendar.winterSolstice ?? { month: 11, day: 21, dawnHour: 8, duskHour: 16 },
  );

  const handleOpenSettings = useCallback(() => {
    setEditMode(calendarMode);
    setEditMonths(calendar.months.map((m) => ({ ...m })));
    setEditWeekDays([...calendar.weekDays]);
    setEditHolidays(calendar.holidays.map((h) => ({ ...h })));
    setEditSummerSolstice(
      calendar.summerSolstice ?? { month: 5, day: 21, dawnHour: 5, duskHour: 21 },
    );
    setEditWinterSolstice(
      calendar.winterSolstice ?? { month: 11, day: 21, dawnHour: 8, duskHour: 16 },
    );
    setSettingsOpen(true);
  }, [calendarMode, calendar]);

  const handleSaveSettings = useCallback(() => {
    const updated: CalendarConfig = {
      months: editMonths.filter((m) => m.name.trim() && m.days > 0),
      weekDays: editWeekDays.filter((w) => w.trim()),
      holidays: editHolidays,
    };
    if (editMode === 'advanced') {
      updated.summerSolstice = editSummerSolstice;
      updated.winterSolstice = editWinterSolstice;
    }
    onSetTimeState({
      ...timeState,
      calendarMode: editMode,
      calendar: updated,
    });
    setSettingsOpen(false);
  }, [
    editMode, editMonths, editWeekDays, editHolidays,
    editSummerSolstice, editWinterSolstice, timeState, onSetTimeState,
  ]);

  const handleAddHoliday = useCallback(() => {
    const name = newHolName.trim();
    if (!name) return;
    setEditHolidays((prev) => [
      ...prev,
      { month: parseInt(newHolMonth, 10), day: parseInt(newHolDay, 10) || 1, name },
    ]);
    setNewHolName('');
  }, [newHolMonth, newHolDay, newHolName]);

  const handleRemoveHoliday = useCallback((index: number) => {
    setEditHolidays((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMonthDaysChange = useCallback((index: number, days: number) => {
    setEditMonths((prev) =>
      prev.map((m, i) => (i === index ? { ...m, days: Math.max(1, days) } : m)),
    );
  }, []);

  const handleMonthNameChange = useCallback((index: number, name: string) => {
    setEditMonths((prev) =>
      prev.map((m, i) => (i === index ? { ...m, name } : m)),
    );
  }, []);

  const handleAddMonth = useCallback(() => {
    setEditMonths((prev) => [...prev, { name: `Month ${prev.length + 1}`, days: 30 }]);
  }, []);

  const handleRemoveMonth = useCallback((index: number) => {
    setEditMonths((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={styles.container}>
      {/* Top bar: gear + today */}
      <div className={styles.topBar}>
        <button
          className={styles.todayBtn}
          onClick={goToday}
          disabled={isViewingCurrent}
        >
          Today
        </button>
        <button className={styles.gearBtn} onClick={handleOpenSettings} title="Settings">
          &#9881;
        </button>
      </div>
      <div className={styles.separator} />

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={goPrevMonth}>&lsaquo;</button>
        <span className={styles.monthTitle}>{monthName} {viewYear}</span>
        <button className={styles.navBtn} onClick={goNextMonth}>&rsaquo;</button>
      </div>

      {/* Seasonal daylight indicator */}
      {hasSeasonal && (
        <div className={styles.seasonalRow}>
          <span className={styles.seasonalLabel}>
            ☀ Dawn {Math.round(timeState.dawnHour)}:00 — Dusk {Math.round(timeState.duskHour)}:00
          </span>
        </div>
      )}

      {/* Calendar grid */}
      <CalendarGrid
        calendar={calendar}
        viewingMonth={viewMonth}
        viewingYear={viewYear}
        currentDay={currentDay}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      {/* Current date label */}
      <div className={styles.dateLabel}>
        Day {currentDay}, {calendar.months[currentMonth]?.name ?? ''}, Year {currentYear}
      </div>

      {/* Settings Modal */}
      <Modal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Calendar Settings"
        contentClassName={styles.wideModal}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save</Button>
          </>
        }
      >
        <div className={styles.settingsContent}>
          <div className={styles.settingsGrid}>
            {/* Seasonal Daylight Toggle */}
            <div className={styles.settingsField}>
              <label className={styles.settingsLabel}>Seasonal Daylight Adjustment</label>
              <p className={styles.settingsHint}>
                When enabled, dawn and dusk hours change automatically based on the current date,
                simulating longer summer days and shorter winter days. The Clock sky arc will reflect these changes.
              </p>
              <div className={styles.modeToggle}>
                <button
                  className={`${styles.modeBtn} ${editMode === 'simple' ? styles.modeBtnActive : ''}`}
                  onClick={() => setEditMode('simple')}
                >
                  Off (Manual)
                </button>
                <button
                  className={`${styles.modeBtn} ${editMode === 'advanced' ? styles.modeBtnActive : ''}`}
                  onClick={() => setEditMode('advanced')}
                >
                  On (Seasonal)
                </button>
              </div>
            </div>

            {/* Seasonal config */}
            {editMode === 'advanced' && (
              <div className={styles.settingsField}>
                <label className={styles.settingsLabel}>Solstice Configuration</label>
                <p className={styles.settingsHint}>
                  Define the longest day (summer solstice) and shortest day (winter solstice).
                  Dawn/dusk hours will smoothly interpolate between these extremes using a cosine
                  curve throughout the year.
                </p>

                <div className={styles.solsticeBlock}>
                  <span className={styles.solsticeTitle}>☀ Summer Solstice (longest day)</span>
                  <div className={styles.solsticeRow}>
                    <select
                      className={styles.settingsSelect}
                      value={editSummerSolstice.month}
                      onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, month: parseInt(e.target.value, 10) })}
                    >
                      {editMonths.map((m, i) => (
                        <option key={i} value={i}>{m.name}</option>
                      ))}
                    </select>
                    <span className={styles.daysUnit}>day</span>
                    <input
                      className={styles.settingsInput}
                      style={{ width: 45 }}
                      type="number"
                      min="1"
                      value={editSummerSolstice.day}
                      onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, day: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div className={styles.solsticeRow}>
                    <span className={styles.daysUnit}>Dawn</span>
                    <input
                      className={styles.settingsInput}
                      style={{ width: 45 }}
                      type="number"
                      min="0"
                      max="12"
                      value={editSummerSolstice.dawnHour}
                      onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, dawnHour: parseInt(e.target.value, 10) || 0 })}
                    />
                    <span className={styles.daysUnit}>:00</span>
                    <span className={styles.daysUnit} style={{ marginLeft: 8 }}>Dusk</span>
                    <input
                      className={styles.settingsInput}
                      style={{ width: 45 }}
                      type="number"
                      min="12"
                      max="24"
                      value={editSummerSolstice.duskHour}
                      onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, duskHour: parseInt(e.target.value, 10) || 12 })}
                    />
                    <span className={styles.daysUnit}>:00</span>
                  </div>
                </div>

                <div className={styles.solsticeBlock}>
                  <span className={styles.solsticeTitle}>❄ Winter Solstice (shortest day)</span>
                  <div className={styles.solsticeRow}>
                    <select
                      className={styles.settingsSelect}
                      value={editWinterSolstice.month}
                      onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, month: parseInt(e.target.value, 10) })}
                    >
                      {editMonths.map((m, i) => (
                        <option key={i} value={i}>{m.name}</option>
                      ))}
                    </select>
                    <span className={styles.daysUnit}>day</span>
                    <input
                      className={styles.settingsInput}
                      style={{ width: 45 }}
                      type="number"
                      min="1"
                      value={editWinterSolstice.day}
                      onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, day: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div className={styles.solsticeRow}>
                    <span className={styles.daysUnit}>Dawn</span>
                    <input
                      className={styles.settingsInput}
                      style={{ width: 45 }}
                      type="number"
                      min="0"
                      max="12"
                      value={editWinterSolstice.dawnHour}
                      onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, dawnHour: parseInt(e.target.value, 10) || 0 })}
                    />
                    <span className={styles.daysUnit}>:00</span>
                    <span className={styles.daysUnit} style={{ marginLeft: 8 }}>Dusk</span>
                    <input
                      className={styles.settingsInput}
                      style={{ width: 45 }}
                      type="number"
                      min="12"
                      max="24"
                      value={editWinterSolstice.duskHour}
                      onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, duskHour: parseInt(e.target.value, 10) || 12 })}
                    />
                    <span className={styles.daysUnit}>:00</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.separator} />

            {/* Months */}
            <div className={styles.settingsField}>
              <label className={styles.settingsLabel}>Months</label>
              <div className={styles.monthsList}>
                {editMonths.map((m, i) => (
                  <div key={i} className={styles.monthEditRow}>
                    <input
                      className={styles.settingsInput}
                      style={{ flex: 1 }}
                      value={m.name}
                      onChange={(e) => handleMonthNameChange(i, e.target.value)}
                    />
                    <input
                      className={styles.settingsInput}
                      style={{ width: 50 }}
                      type="number"
                      min="1"
                      value={m.days}
                      onChange={(e) => handleMonthDaysChange(i, parseInt(e.target.value, 10) || 1)}
                    />
                    <span className={styles.daysUnit}>days</span>
                    <button className={styles.removeBtn} onClick={() => handleRemoveMonth(i)}>X</button>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={handleAddMonth}>+ Add Month</button>
              </div>
            </div>

            {/* Week days */}
            <div className={styles.settingsField}>
              <label className={styles.settingsLabel}>Week Days (comma-separated)</label>
              <input
                className={styles.settingsInput}
                style={{ width: '100%' }}
                value={editWeekDays.join(', ')}
                onChange={(e) =>
                  setEditWeekDays(e.target.value.split(',').map((s) => s.trim()))
                }
              />
            </div>

            {/* Holidays */}
            <div className={styles.settingsField}>
              <label className={styles.settingsLabel}>Holidays</label>
              <div className={styles.holidaysList}>
                {editHolidays.map((h, i) => (
                  <div key={i} className={styles.holidayRow}>
                    <span className={styles.holidayText}>
                      {editMonths[h.month]?.name ?? `M${h.month}`} {h.day} — {h.name}
                    </span>
                    <button className={styles.removeBtn} onClick={() => handleRemoveHoliday(i)}>X</button>
                  </div>
                ))}
                <div className={styles.holidayAddRow}>
                  <select
                    className={styles.settingsSelect}
                    value={newHolMonth}
                    onChange={(e) => setNewHolMonth(e.target.value)}
                  >
                    {editMonths.map((m, i) => (
                      <option key={i} value={i}>{m.name}</option>
                    ))}
                  </select>
                  <input
                    className={styles.settingsInput}
                    style={{ width: 40 }}
                    type="number"
                    min="1"
                    placeholder="Day"
                    value={newHolDay}
                    onChange={(e) => setNewHolDay(e.target.value)}
                  />
                  <input
                    className={styles.settingsInput}
                    style={{ flex: 1 }}
                    placeholder="Name"
                    value={newHolName}
                    onChange={(e) => setNewHolName(e.target.value)}
                  />
                  <button className={styles.addBtn} onClick={handleAddHoliday}>+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

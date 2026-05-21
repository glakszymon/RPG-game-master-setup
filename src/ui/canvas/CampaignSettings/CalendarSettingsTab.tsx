/*
 * CalendarSettingsTab — calendar settings (current date, seasonal daylight,
 * months, week days, holidays) embedded within Campaign Settings modal.
 * Same UI as TimeCalendar's settings modal.
 */

import { useState, useCallback } from 'react';
import { Button } from '../../components/Button/Button';
import styles from './CampaignSettings.module.css';
import calStyles from '../../tools/time-calendar/TimeCalendar.module.css';
import type { CampaignTimeState, CalendarConfig } from '../../canvas/types';

interface CalendarSettingsTabProps {
  timeState: CampaignTimeState;
  onSetTimeState: (timeState: CampaignTimeState) => void;
}

function CalendarSettingsTab({ timeState, onSetTimeState }: CalendarSettingsTabProps) {
  const { currentDay, currentMonth, currentYear, calendar, calendarMode } = timeState;

  const [editMode, setEditMode] = useState(calendarMode);
  const [editMonths, setEditMonths] = useState(
    () => calendar.months.map((m) => ({ ...m })),
  );
  const [editWeekDays, setEditWeekDays] = useState(() => [...calendar.weekDays]);
  const [editHolidays, setEditHolidays] = useState(
    () => calendar.holidays.map((h) => ({ ...h })),
  );
  const [newHolMonth, setNewHolMonth] = useState('0');
  const [newHolDay, setNewHolDay] = useState('1');
  const [newHolName, setNewHolName] = useState('');
  const [editSummerSolstice, setEditSummerSolstice] = useState(
    () => calendar.summerSolstice ?? { month: 5, day: 21, dawnHour: 5, duskHour: 21 },
  );
  const [editWinterSolstice, setEditWinterSolstice] = useState(
    () => calendar.winterSolstice ?? { month: 11, day: 21, dawnHour: 8, duskHour: 16 },
  );
  const [editDay, setEditDay] = useState(String(currentDay));
  const [editMonth, setEditMonth] = useState(String(currentMonth));
  const [editYear, setEditYear] = useState(String(currentYear));

  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    const updated: CalendarConfig = {
      months: editMonths.filter((m) => m.name.trim() && m.days > 0),
      weekDays: editWeekDays.filter((w) => w.trim()),
      holidays: editHolidays,
    };
    if (editMode === 'advanced') {
      updated.summerSolstice = editSummerSolstice;
      updated.winterSolstice = editWinterSolstice;
    }
    const monthIdx = Math.max(0, Math.min(updated.months.length - 1, parseInt(editMonth, 10) || 0));
    const maxDay = updated.months[monthIdx]?.days ?? 30;
    const day = Math.max(1, Math.min(maxDay, parseInt(editDay, 10) || 1));
    const year = parseInt(editYear, 10) || 1;

    onSetTimeState({
      ...timeState,
      calendarMode: editMode,
      calendar: updated,
      currentDay: day,
      currentMonth: monthIdx,
      currentYear: year,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [
    editMode, editMonths, editWeekDays, editHolidays,
    editSummerSolstice, editWinterSolstice,
    editDay, editMonth, editYear,
    timeState, onSetTimeState,
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
    <div className={styles.mainTab}>
      <div className={calStyles.settingsContent}>
        <div className={calStyles.settingsGrid}>
          {/* Starting Date */}
          <div className={calStyles.settingsField}>
            <label className={calStyles.settingsLabel}>Current Date</label>
            <div className={calStyles.solsticeRow}>
              <span className={calStyles.daysUnit}>Day</span>
              <input
                className={calStyles.settingsInput}
                style={{ width: 50 }}
                type="number"
                min="1"
                value={editDay}
                onChange={(e) => setEditDay(e.target.value)}
              />
              <span className={calStyles.daysUnit}>Month</span>
              <select
                className={calStyles.settingsSelect}
                value={editMonth}
                onChange={(e) => setEditMonth(e.target.value)}
              >
                {editMonths.map((m, i) => (
                  <option key={i} value={i}>{m.name}</option>
                ))}
              </select>
              <span className={calStyles.daysUnit}>Year</span>
              <input
                className={calStyles.settingsInput}
                style={{ width: 60 }}
                type="number"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              />
            </div>
          </div>

          <div className={calStyles.separator} />

          {/* Seasonal Daylight Toggle */}
          <div className={calStyles.settingsField}>
            <label className={calStyles.settingsLabel}>Seasonal Daylight Adjustment</label>
            <p className={calStyles.settingsHint}>
              When enabled, dawn and dusk hours change automatically based on the current date,
              simulating longer summer days and shorter winter days.
            </p>
            <div className={calStyles.modeToggle}>
              <button
                className={`${calStyles.modeBtn} ${editMode === 'simple' ? calStyles.modeBtnActive : ''}`}
                onClick={() => setEditMode('simple')}
              >
                Off (Manual)
              </button>
              <button
                className={`${calStyles.modeBtn} ${editMode === 'advanced' ? calStyles.modeBtnActive : ''}`}
                onClick={() => setEditMode('advanced')}
              >
                On (Seasonal)
              </button>
            </div>
          </div>

          {/* Seasonal config */}
          {editMode === 'advanced' && (
            <div className={calStyles.settingsField}>
              <label className={calStyles.settingsLabel}>Solstice Configuration</label>
              <p className={calStyles.settingsHint}>
                Define the longest day (summer solstice) and shortest day (winter solstice).
                Dawn/dusk hours will smoothly interpolate between these extremes.
              </p>

              <div className={calStyles.solsticeBlock}>
                <span className={calStyles.solsticeTitle}>Summer Solstice (longest day)</span>
                <div className={calStyles.solsticeRow}>
                  <select
                    className={calStyles.settingsSelect}
                    value={editSummerSolstice.month}
                    onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, month: parseInt(e.target.value, 10) })}
                  >
                    {editMonths.map((m, i) => (
                      <option key={i} value={i}>{m.name}</option>
                    ))}
                  </select>
                  <span className={calStyles.daysUnit}>day</span>
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 45 }}
                    type="number"
                    min="1"
                    value={editSummerSolstice.day}
                    onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, day: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className={calStyles.solsticeRow}>
                  <span className={calStyles.daysUnit}>Dawn</span>
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 45 }}
                    type="number"
                    min="0"
                    max="12"
                    value={editSummerSolstice.dawnHour}
                    onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, dawnHour: parseInt(e.target.value, 10) || 0 })}
                  />
                  <span className={calStyles.daysUnit}>:00</span>
                  <span className={calStyles.daysUnit} style={{ marginLeft: 8 }}>Dusk</span>
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 45 }}
                    type="number"
                    min="12"
                    max="24"
                    value={editSummerSolstice.duskHour}
                    onChange={(e) => setEditSummerSolstice({ ...editSummerSolstice, duskHour: parseInt(e.target.value, 10) || 12 })}
                  />
                  <span className={calStyles.daysUnit}>:00</span>
                </div>
              </div>

              <div className={calStyles.solsticeBlock}>
                <span className={calStyles.solsticeTitle}>Winter Solstice (shortest day)</span>
                <div className={calStyles.solsticeRow}>
                  <select
                    className={calStyles.settingsSelect}
                    value={editWinterSolstice.month}
                    onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, month: parseInt(e.target.value, 10) })}
                  >
                    {editMonths.map((m, i) => (
                      <option key={i} value={i}>{m.name}</option>
                    ))}
                  </select>
                  <span className={calStyles.daysUnit}>day</span>
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 45 }}
                    type="number"
                    min="1"
                    value={editWinterSolstice.day}
                    onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, day: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div className={calStyles.solsticeRow}>
                  <span className={calStyles.daysUnit}>Dawn</span>
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 45 }}
                    type="number"
                    min="0"
                    max="12"
                    value={editWinterSolstice.dawnHour}
                    onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, dawnHour: parseInt(e.target.value, 10) || 0 })}
                  />
                  <span className={calStyles.daysUnit}>:00</span>
                  <span className={calStyles.daysUnit} style={{ marginLeft: 8 }}>Dusk</span>
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 45 }}
                    type="number"
                    min="12"
                    max="24"
                    value={editWinterSolstice.duskHour}
                    onChange={(e) => setEditWinterSolstice({ ...editWinterSolstice, duskHour: parseInt(e.target.value, 10) || 12 })}
                  />
                  <span className={calStyles.daysUnit}>:00</span>
                </div>
              </div>
            </div>
          )}

          <div className={calStyles.separator} />

          {/* Months */}
          <div className={calStyles.settingsField}>
            <label className={calStyles.settingsLabel}>Months</label>
            <div className={calStyles.monthsList}>
              {editMonths.map((m, i) => (
                <div key={i} className={calStyles.monthEditRow}>
                  <input
                    className={calStyles.settingsInput}
                    style={{ flex: 1 }}
                    value={m.name}
                    onChange={(e) => handleMonthNameChange(i, e.target.value)}
                  />
                  <input
                    className={calStyles.settingsInput}
                    style={{ width: 50 }}
                    type="number"
                    min="1"
                    value={m.days}
                    onChange={(e) => handleMonthDaysChange(i, parseInt(e.target.value, 10) || 1)}
                  />
                  <span className={calStyles.daysUnit}>days</span>
                  <button className={calStyles.removeBtn} onClick={() => handleRemoveMonth(i)}>X</button>
                </div>
              ))}
              <button className={calStyles.addBtn} onClick={handleAddMonth}>+ Add Month</button>
            </div>
          </div>

          {/* Week days */}
          <div className={calStyles.settingsField}>
            <label className={calStyles.settingsLabel}>Week Days (comma-separated)</label>
            <input
              className={calStyles.settingsInput}
              style={{ width: '100%' }}
              value={editWeekDays.join(', ')}
              onChange={(e) =>
                setEditWeekDays(e.target.value.split(',').map((s) => s.trim()))
              }
            />
          </div>

          {/* Holidays */}
          <div className={calStyles.settingsField}>
            <label className={calStyles.settingsLabel}>Holidays</label>
            <div className={calStyles.holidaysList}>
              {editHolidays.map((h, i) => (
                <div key={i} className={calStyles.holidayRow}>
                  <span className={calStyles.holidayText}>
                    {editMonths[h.month]?.name ?? `M${h.month}`} {h.day} — {h.name}
                  </span>
                  <button className={calStyles.removeBtn} onClick={() => handleRemoveHoliday(i)}>X</button>
                </div>
              ))}
              <div className={calStyles.holidayAddRow}>
                <select
                  className={calStyles.settingsSelect}
                  value={newHolMonth}
                  onChange={(e) => setNewHolMonth(e.target.value)}
                >
                  {editMonths.map((m, i) => (
                    <option key={i} value={i}>{m.name}</option>
                  ))}
                </select>
                <input
                  className={calStyles.settingsInput}
                  style={{ width: 40 }}
                  type="number"
                  min="1"
                  placeholder="Day"
                  value={newHolDay}
                  onChange={(e) => setNewHolDay(e.target.value)}
                />
                <input
                  className={calStyles.settingsInput}
                  style={{ flex: 1 }}
                  placeholder="Name"
                  value={newHolName}
                  onChange={(e) => setNewHolName(e.target.value)}
                />
                <button className={calStyles.addBtn} onClick={handleAddHoliday}>+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button onClick={handleSave}>Save</Button>
        {saved && <span className={styles.savedMsg}>Saved!</span>}
      </div>
    </div>
  );
}

export { CalendarSettingsTab };

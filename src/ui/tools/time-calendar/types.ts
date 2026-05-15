/*
 * TimeCalendar — local UI state types.
 */

export interface TimeCalendarLocalState {
  /** Which month index is being viewed (may differ from currentMonth) */
  viewingMonth: number;
  /** Which year is being viewed */
  viewingYear: number;
  /** Settings modal open */
  settingsOpen: boolean;
}

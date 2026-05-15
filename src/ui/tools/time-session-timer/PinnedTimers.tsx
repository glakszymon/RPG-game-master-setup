/**
 * PinnedTimers — fixed overlay showing pinned timers below the PresetToolbar.
 * Renders compact TimerItem cards that are always visible on the canvas.
 */

import { useCallback, useMemo } from 'react';
import { TimerItem } from './TimerItem';
import styles from './PinnedTimers.module.css';
import type { CampaignTimeState, CustomTimer } from '../../canvas/types';

interface PinnedTimersProps {
  timeState: CampaignTimeState;
  onSetTimeState: (timeState: CampaignTimeState) => void;
}

export function PinnedTimers({ timeState, onSetTimeState }: PinnedTimersProps) {
  const pinnedTimers = useMemo(
    () => timeState.customTimers.filter((t) => t.pinned),
    [timeState.customTimers],
  );

  const patchTimers = useCallback(
    (fn: (timers: CustomTimer[]) => CustomTimer[]) => {
      onSetTimeState({ ...timeState, customTimers: fn(timeState.customTimers) });
    },
    [timeState, onSetTimeState],
  );

  const handleDelete = useCallback((id: string) => {
    patchTimers((ts) => ts.filter((t) => t.id !== id));
  }, [patchTimers]);

  const handleTogglePause = useCallback((id: string) => {
    patchTimers((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      if (t.startedAt !== null) {
        return { ...t, accumulatedMs: t.accumulatedMs + (Date.now() - t.startedAt), startedAt: null };
      }
      return { ...t, startedAt: Date.now() };
    }));
  }, [patchTimers]);

  const handleExpire = useCallback((id: string) => {
    patchTimers((ts) => ts.map((t) => t.id === id ? { ...t, completed: true } : t));
  }, [patchTimers]);

  const handleRestart = useCallback((id: string) => {
    patchTimers((ts) => ts.map((t) =>
      t.id === id ? { ...t, startedAt: Date.now(), accumulatedMs: 0, elapsedMinutes: 0, completed: false } : t,
    ));
  }, [patchTimers]);

  const handleEdit = useCallback((id: string, patch: Partial<Pick<CustomTimer, 'name' | 'targetMinutes' | 'direction'>>) => {
    patchTimers((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t));
  }, [patchTimers]);

  const handlePin = useCallback((id: string) => {
    patchTimers((ts) => ts.map((t) => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }, [patchTimers]);

  if (pinnedTimers.length === 0) return null;

  return (
    <div className={styles.panel}>
      {pinnedTimers.map((timer) => (
        <div key={timer.id} className={styles.pinnedCard}>
          <TimerItem
            timer={timer}
            onDelete={handleDelete}
            onTogglePause={handleTogglePause}
            onExpire={handleExpire}
            onRestart={handleRestart}
            onEdit={handleEdit}
            onPin={handlePin}
            compact
          />
        </div>
      ))}
    </div>
  );
}

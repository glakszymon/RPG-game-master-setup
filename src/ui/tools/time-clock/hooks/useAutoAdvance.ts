/*
 * useAutoAdvance — drives in-game time forward automatically
 * based on real elapsed time × configurable ratio.
 *
 * Advances only in whole minutes (no fractional time on display).
 * Accumulates sub-minute remainder between ticks.
 */

import { useEffect, useRef } from 'react';
import type { CampaignTimeState } from '../../../canvas/types';

const TICK_INTERVAL_MS = 1000;

interface UseAutoAdvanceOptions {
  timeState: CampaignTimeState;
  onAdvanceTime: (minutes: number) => void;
  paused: boolean;
}

export function useAutoAdvance({
  timeState,
  onAdvanceTime,
  paused,
}: UseAutoAdvanceOptions) {
  const onAdvanceRef = useRef(onAdvanceTime);
  onAdvanceRef.current = onAdvanceTime;

  const ratioRef = useRef(timeState.autoAdvance?.ratio ?? 10);
  ratioRef.current = timeState.autoAdvance?.ratio ?? 10;

  const lastTickRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  const enabled = timeState.autoAdvance?.enabled ?? false;
  const running = enabled && !paused;

  useEffect(() => {
    if (!running) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = Date.now();
    accumulatorRef.current = 0;

    const id = setInterval(() => {
      const last = lastTickRef.current;
      if (last === null) return;

      const now = Date.now();
      const elapsedRealMinutes = (now - last) / 60_000;
      const inGameMinutes = elapsedRealMinutes * ratioRef.current;
      lastTickRef.current = now;

      accumulatorRef.current += inGameMinutes;

      const wholeMinutes = Math.floor(accumulatorRef.current);
      if (wholeMinutes >= 1) {
        accumulatorRef.current -= wholeMinutes;
        onAdvanceRef.current(wholeMinutes);
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(id);
      lastTickRef.current = null;
    };
  }, [running]);
}

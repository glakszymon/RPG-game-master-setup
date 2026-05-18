/*
 * useCombatState — encapsulates combat tracker logic.
 *
 * Provides actions: nextTurn, addCombatant, removeCombatant,
 * rollInitiative, sortByInitiative, damage, heal, toggleCondition, reset.
 */

import { useCallback } from 'react';
import { publish } from '../../../event-bus';
import type { Combatant, CombatTrackerState, CombatCondition, ActiveCondition, ConditionExpiry } from '../types';
import { DEFAULT_COMBAT_TRACKER_STATE, DEFAULT_CONDITIONS } from '../types';

/** Generate a unique ID */
function uid(): string {
  return crypto.randomUUID();
}

export function useCombatState(
  state: CombatTrackerState | undefined,
  onStateChange: (state: CombatTrackerState) => void,
) {
  const current = state ?? DEFAULT_COMBAT_TRACKER_STATE;

  const update = useCallback(
    (patch: Partial<CombatTrackerState>) => {
      onStateChange({ ...current, ...patch });
    },
    [current, onStateChange],
  );

  /** Advance turn, decrement condition durations, return expired conditions */
  const nextTurn = useCallback((): ConditionExpiry[] => {
    if (current.combatants.length === 0) return [];

    let nextIndex = current.activeCombatantIndex + 1;
    let nextRound = current.currentRound;
    if (nextIndex >= current.combatants.length) {
      nextIndex = 0;
      nextRound += 1;
    }

    // Decrement conditions on the combatant whose turn just ended
    const endingIndex = current.activeCombatantIndex;
    const expired: ConditionExpiry[] = [];
    const allConditions = current.conditions.length > 0 ? current.conditions : DEFAULT_CONDITIONS;

    const updatedCombatants = current.combatants.map((c, idx) => {
      if (idx !== endingIndex || endingIndex < 0) return c;

      const newConditions: ActiveCondition[] = [];
      for (const ac of c.conditions) {
        if (ac.mode === 'time') {
          // Time-based: check if expired
          if (ac.expiresAt !== null && Date.now() >= ac.expiresAt) {
            const condDef = allConditions.find((cd) => cd.id === ac.conditionId);
            expired.push({
              combatantName: c.name,
              conditionName: condDef?.name ?? ac.conditionId,
            });
          } else {
            newConditions.push(ac);
          }
        } else {
          // Round-based
          if (ac.roundsLeft === null) {
            newConditions.push(ac);
          } else if (ac.roundsLeft > 1) {
            newConditions.push({ ...ac, roundsLeft: ac.roundsLeft - 1 });
          } else {
            const condDef = allConditions.find((cd) => cd.id === ac.conditionId);
            expired.push({
              combatantName: c.name,
              conditionName: condDef?.name ?? ac.conditionId,
            });
          }
        }
      }
      return { ...c, conditions: newConditions };
    });

    update({
      combatants: updatedCombatants,
      activeCombatantIndex: nextIndex,
      currentRound: nextRound,
      isStarted: true,
    });

    // Publish conditions change for any combatant whose conditions were modified
    if (endingIndex >= 0) {
      const updated = updatedCombatants[endingIndex];
      const original = current.combatants[endingIndex];
      if (updated && original && updated.conditions.length !== original.conditions.length) {
        publish('combat:conditions-changed', {
          sourceType: updated.sourceType,
          sourceId: updated.sourceId,
          conditions: updated.conditions,
        });
      }
    }

    return expired;
  }, [current, update]);

  const addCombatant = useCallback((combatant: Omit<Combatant, 'id'>) => {
    const newCombatant: Combatant = { ...combatant, id: uid() };
    update({ combatants: [...current.combatants, newCombatant] });
  }, [current, update]);

  const addCombatants = useCallback((combatants: Array<Omit<Combatant, 'id'>>) => {
    const newCombatants = combatants.map((c) => ({ ...c, id: uid() }));
    update({ combatants: [...current.combatants, ...newCombatants] });
  }, [current, update]);

  const removeCombatant = useCallback((id: string) => {
    const idx = current.combatants.findIndex((c) => c.id === id);
    const newCombatants = current.combatants.filter((c) => c.id !== id);
    let newActiveIndex = current.activeCombatantIndex;
    if (idx <= current.activeCombatantIndex && newActiveIndex > 0) {
      newActiveIndex -= 1;
    }
    if (newCombatants.length === 0) newActiveIndex = -1;
    update({ combatants: newCombatants, activeCombatantIndex: newActiveIndex });
  }, [current, update]);

  const rollInitiative = useCallback(() => {
    const rolled = current.combatants.map((c) => ({
      ...c,
      initiativeRoll: Math.floor(Math.random() * 20) + 1 + c.initiativeModifier,
    }));
    const sorted = [...rolled].sort((a, b) => (b.initiativeRoll ?? 0) - (a.initiativeRoll ?? 0));
    update({ combatants: sorted, activeCombatantIndex: -1, isStarted: false });
  }, [current, update]);

  const sortByInitiative = useCallback(() => {
    const sorted = [...current.combatants].sort(
      (a, b) => (b.initiativeRoll ?? 0) - (a.initiativeRoll ?? 0),
    );
    update({ combatants: sorted });
  }, [current, update]);

  const updateInitiative = useCallback((id: string, value: number) => {
    update({
      combatants: current.combatants.map((c) =>
        c.id === id ? { ...c, initiativeRoll: value } : c,
      ),
    });
  }, [current, update]);

  const damage = useCallback((id: string, amount: number) => {
    const c = current.combatants.find((cb) => cb.id === id);
    if (c) {
      publish('combat:hp-changed', { sourceType: c.sourceType, sourceId: c.sourceId, delta: -amount, currentHp: c.hp - amount, maxHp: c.maxHp });
    }
    update({
      combatants: current.combatants.map((cb) =>
        cb.id === id ? { ...cb, hp: cb.hp - amount } : cb,
      ),
    });
  }, [current, update]);

  const heal = useCallback((id: string, amount: number) => {
    const c = current.combatants.find((cb) => cb.id === id);
    if (c) {
      publish('combat:hp-changed', { sourceType: c.sourceType, sourceId: c.sourceId, delta: +amount, currentHp: c.hp + amount, maxHp: c.maxHp });
    }
    update({
      combatants: current.combatants.map((cb) =>
        cb.id === id ? { ...cb, hp: cb.hp + amount } : cb,
      ),
    });
  }, [current, update]);

  /** Toggle a condition on a combatant with optional duration */
  const applyCondition = useCallback((combatantId: string, conditionId: string, mode: 'rounds' | 'time', value: number) => {
    const ac: ActiveCondition = mode === 'rounds'
      ? { conditionId, mode: 'rounds', roundsLeft: value, expiresAt: null }
      : { conditionId, mode: 'time', roundsLeft: null, expiresAt: Date.now() + value * 1000 };

    const updatedCombatants = current.combatants.map((c) => {
      if (c.id !== combatantId) return c;
      const existing = c.conditions.findIndex((a) => a.conditionId === conditionId);
      if (existing >= 0) {
        const newConditions = [...c.conditions];
        newConditions[existing] = ac;
        return { ...c, conditions: newConditions };
      }
      return { ...c, conditions: [...c.conditions, ac] };
    });

    update({ combatants: updatedCombatants });

    // Publish conditions change for map overlay
    const target = updatedCombatants.find((c) => c.id === combatantId);
    if (target) {
      publish('combat:conditions-changed', {
        sourceType: target.sourceType,
        sourceId: target.sourceId,
        conditions: target.conditions,
      });
    }
  }, [current, update]);

  /** Remove an active condition from a combatant */
  const removeActiveCondition = useCallback((combatantId: string, conditionId: string) => {
    const updatedCombatants = current.combatants.map((c) => {
      if (c.id !== combatantId) return c;
      return { ...c, conditions: c.conditions.filter((ac) => ac.conditionId !== conditionId) };
    });

    update({ combatants: updatedCombatants });

    const target = updatedCombatants.find((c) => c.id === combatantId);
    if (target) {
      publish('combat:conditions-changed', {
        sourceType: target.sourceType,
        sourceId: target.sourceId,
        conditions: target.conditions,
      });
    }
  }, [current, update]);

  const reorderCombatant = useCallback((fromId: string, toId: string) => {
    const combatants = [...current.combatants];
    const fromIdx = combatants.findIndex((c) => c.id === fromId);
    const toIdx = combatants.findIndex((c) => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = combatants.splice(fromIdx, 1);
    combatants.splice(toIdx, 0, moved);
    update({ combatants });
  }, [current, update]);

  const resetCombat = useCallback(() => {
    publish('combat:reset', {});
    update({
      combatants: [],
      activeCombatantIndex: -1,
      currentRound: 1,
      isStarted: false,
    });
  }, [update]);

  const addCondition = useCallback((name: string) => {
    const newCondition: CombatCondition = {
      id: uid(),
      name,
      isCustom: true,
    };
    update({ conditions: [...current.conditions, newCondition] });
  }, [current, update]);

  const removeCondition = useCallback((id: string) => {
    update({
      conditions: current.conditions.filter((c) => c.id !== id),
      combatants: current.combatants.map((c) => ({
        ...c,
        conditions: c.conditions.filter((ac) => ac.conditionId !== id),
      })),
    });
  }, [current, update]);

  return {
    state: current,
    conditions: current.conditions.length > 0 ? current.conditions : DEFAULT_CONDITIONS,
    nextTurn,
    addCombatant,
    addCombatants,
    removeCombatant,
    rollInitiative,
    sortByInitiative,
    updateInitiative,
    damage,
    heal,
    applyCondition,
    removeActiveCondition,
    reorderCombatant,
    resetCombat,
    addCondition,
    removeCondition,
  };
}

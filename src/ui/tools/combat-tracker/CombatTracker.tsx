/*
 * CombatTracker — main tool component rendered inside a CanvasWindow.
 *
 * Manages combat encounters: initiative order, HP tracking,
 * conditions, and integration with other tools via drag&drop.
 */

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { publish } from '../../event-bus';
import { useCombatState } from './hooks/useCombatState';
import { CombatantCard } from './components/CombatantCard';
import { DamageHealPopup } from './components/DamageHealPopup';
import { ConditionPicker } from './components/ConditionPicker';
import { AddCombatantForm } from './components/AddCombatantForm';
import type { CombatTrackerState, Combatant } from './types';
import styles from './CombatTracker.module.css';

interface CombatTrackerProps {
  toolState: CombatTrackerState | undefined;
  onToolStateChange: (state: CombatTrackerState) => void;
  campaignId: string;
}

interface DragData {
  type: string;
  id?: string;
  name?: string;
  portraitPath?: string | null;
  hp?: number;
  maxHp?: number;
  armor?: number;
  initiativeModifier?: number;
  meta?: {
    hp?: number;
    ac?: number;
    cr?: string;
    creatureType?: string;
  };
  creatures?: Array<{
    id?: string;
    name: string;
    portraitPath?: string | null;
    hp?: number;
    maxHp?: number;
    armor?: number;
    initiativeModifier?: number;
    meta?: { hp?: number; ac?: number };
  }>;
}

export function CombatTracker({ toolState, onToolStateChange }: CombatTrackerProps) {
  const {
    state,
    conditions,
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
  } = useCombatState(toolState, onToolStateChange);

  const [hpTarget, setHpTarget] = useState<Combatant | null>(null);
  const [conditionTarget, setConditionTarget] = useState<Combatant | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<string | null>(null);
  const [initValue, setInitValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [expiryNotifications, setExpiryNotifications] = useState<string[]>([]);
  const dragIdRef = useRef<string | null>(null);
  const dragCounterRef = useRef(0);

  /* ── Next turn with expiry notifications ── */
  const handleNextTurn = useCallback(() => {
    const expired = nextTurn();

    // Publish turn-changed for map glow
    const combatants = state.combatants;
    let nextIndex = state.activeCombatantIndex + 1;
    if (nextIndex >= combatants.length) nextIndex = 0;
    const active = combatants[nextIndex];
    if (active) {
      publish('combat:turn-changed', {
        sourceType: active.sourceType,
        sourceId: active.sourceId,
        combatantId: active.id,
      });
    }

    if (expired.length > 0) {
      const messages = expired.map((e) => `${e.conditionName} wygasł na ${e.combatantName}`);
      setExpiryNotifications(messages);
      setTimeout(() => setExpiryNotifications([]), 5000);
    }
  }, [nextTurn, state.combatants, state.activeCombatantIndex]);

  /* ── Drag & Drop (accept from other tools) ── */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounterRef.current = 0;
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    try {
      const data: DragData = JSON.parse(raw);

      if (data.type === 'party-character' || data.type === 'bestiary-creature' || data.type === 'encounter-instance') {
        const hp = data.hp ?? data.meta?.hp ?? 10;
        const armor = data.armor ?? data.meta?.ac ?? 0;
        const sourceType = data.type === 'party-character' ? 'party'
          : data.type === 'encounter-instance' ? 'instance'
          : 'bestiary';
        addCombatant({
          name: data.name ?? 'Unknown',
          portraitPath: data.portraitPath ?? null,
          hp,
          maxHp: data.maxHp ?? hp,
          armor,
          initiativeModifier: data.initiativeModifier ?? 0,
          initiativeRoll: null,
          conditions: [],
          sourceType,
          sourceId: data.id ?? null,
        });
      } else if (data.type === 'encounter-set' && data.creatures) {
        addCombatants(data.creatures.map((c) => {
          const cHp = c.hp ?? c.meta?.hp ?? 10;
          const cArmor = c.armor ?? c.meta?.ac ?? 0;
          return {
            name: c.name,
            portraitPath: c.portraitPath ?? null,
            hp: cHp,
            maxHp: c.maxHp ?? cHp,
            armor: cArmor,
            initiativeModifier: c.initiativeModifier ?? 0,
            initiativeRoll: null,
            conditions: [],
            sourceType: 'bestiary' as const,
            sourceId: c.id ?? null,
           };
        }));
      }
    } catch {
      // Ignore invalid JSON
    }
  }, [addCombatant, addCombatants]);

  /* ── Internal reorder drag ── */
  const handleCardDragStart = useCallback((e: React.DragEvent, combatant: Combatant) => {
    dragIdRef.current = combatant.id;
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'combat-combatant',
      id: combatant.id,
      name: combatant.name,
      portraitPath: combatant.portraitPath,
      sourceType: combatant.sourceType,
      sourceId: combatant.sourceId,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleCardDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragIdRef.current && dragIdRef.current !== targetId) {
      reorderCombatant(dragIdRef.current, targetId);
    }
    dragIdRef.current = null;
  }, [reorderCombatant]);

  const handleCardDragEnd = useCallback(() => {
    dragIdRef.current = null;
  }, []);

  /* ── Manual add ── */
  const handleManualAdd = useCallback((data: { name: string; hp: number; maxHp: number; initiativeModifier: number }) => {
    addCombatant({
      name: data.name,
      portraitPath: null,
      hp: data.hp,
      maxHp: data.maxHp,
      armor: 0,
      initiativeModifier: data.initiativeModifier,
      initiativeRoll: null,
      conditions: [],
      sourceType: 'manual',
      sourceId: null,
    });
  }, [addCombatant]);

  /* ── Initiative inline edit ── */
  const handleInitiativeClick = useCallback((id: string, currentValue: number | null) => {
    setEditingInitiative(id);
    setInitValue(currentValue !== null ? String(currentValue) : '');
  }, []);

  const commitInitiative = useCallback(() => {
    if (editingInitiative) {
      const num = parseInt(initValue, 10);
      if (!isNaN(num)) {
        updateInitiative(editingInitiative, num);
      }
      setEditingInitiative(null);
    }
  }, [editingInitiative, initValue, updateInitiative]);

  return (
    <div
      className={`${styles.container} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.roundBadge}>Round {state.currentRound}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.toolButton} onClick={() => setAddFormOpen(true)} title="Add combatant">
            ☩
          </button>
          <button className={styles.toolButton} onClick={rollInitiative} title="Roll initiative for all">
            🎲
          </button>
          <button className={styles.toolButton} onClick={sortByInitiative} title="Sort by initiative">
            ⇅
          </button>
          <button className={styles.toolButton} onClick={handleNextTurn} title="Next turn">
            ▶
          </button>
          <button className={styles.toolButton} onClick={resetCombat} title="Reset combat">
            ↺
          </button>
        </div>
      </div>

      {/* Expiry notifications */}
      {expiryNotifications.length > 0 && (
        <div className={styles.notifications}>
          {expiryNotifications.map((msg, i) => (
            <div key={i} className={styles.notification}>{msg}</div>
          ))}
        </div>
      )}

      {/* Combatant list */}
      <div className={styles.list}>
        {state.combatants.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No combatants</p>
            <p className={styles.emptyHint}>Drag from Party Tracker or Bestiary, or click +</p>
          </div>
        ) : (
          state.combatants.map((combatant, idx) => (
            <div key={combatant.id} className={styles.cardWrapper}>
              {/* Initiative inline edit */}
              {editingInitiative === combatant.id ? (
                <input
                  className={styles.initInput}
                  type="number"
                  value={initValue}
                  onChange={(e) => setInitValue(e.target.value)}
                  onBlur={commitInitiative}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitInitiative(); if (e.key === 'Escape') setEditingInitiative(null); }}
                  autoFocus
                />
              ) : (
                <button
                  className={styles.initDisplay}
                  onClick={() => handleInitiativeClick(combatant.id, combatant.initiativeRoll)}
                  title="Click to edit initiative"
                >
                  {combatant.initiativeRoll !== null ? combatant.initiativeRoll : '—'}
                </button>
              )}

              <CombatantCard
                combatant={combatant}
                isActive={state.isStarted && idx === state.activeCombatantIndex}
                conditions={conditions}
                onHpClick={setHpTarget}
                onConditionClick={setConditionTarget}
                onRemove={removeCombatant}
                onDragStart={handleCardDragStart}
                onDragOver={handleCardDragOver}
                onDrop={handleCardDrop}
                onDragEnd={handleCardDragEnd}
              />
            </div>
          ))
        )}
      </div>

      {/* Popups */}
      {hpTarget && createPortal(
        <DamageHealPopup
          combatant={hpTarget}
          onDamage={damage}
          onHeal={heal}
          onClose={() => setHpTarget(null)}
        />,
        document.body,
      )}

      {conditionTarget && createPortal(
        <ConditionPicker
          conditions={conditions}
          activeConditions={conditionTarget.conditions}
          onApply={(conditionId, mode, value) => applyCondition(conditionTarget.id, conditionId, mode, value)}
          onRemoveCondition={(conditionId) => removeActiveCondition(conditionTarget.id, conditionId)}
          onAddCustom={addCondition}
          onRemoveCustom={removeCondition}
          onClose={() => setConditionTarget(null)}
        />,
        document.body,
      )}

      {addFormOpen && createPortal(
        <AddCombatantForm
          onAdd={handleManualAdd}
          onClose={() => setAddFormOpen(false)}
        />,
        document.body,
      )}
    </div>
  );
}

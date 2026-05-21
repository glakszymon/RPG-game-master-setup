/*
 * EncounterSets — read-only compact display of creature instances
 * grouped into encounter folders.
 *
 * Left panel: encounter group tree (folders + instances).
 * Right panel: compact read-only creature cards for all instances in selected folder.
 */

import { useCallback, useMemo, useState } from 'react';
import { useBestiaryState } from './hooks/useBestiaryState';
import { templateToFieldValues } from './templateConversion';
import { EncounterTreePanel } from './components/EncounterTreePanel';
import { getXpFromCr, getProficiencyBonus, formatXp } from './crUtilities';
import type { EncounterSetsToolState, CreatureInstance } from './types';
import { DEFAULT_ENCOUNTER_SETS_STATE } from './types';
import type { FieldValue } from '../../components/dynamic-fields';
import styles from './Bestiary.module.css';

interface EncounterSetsProps {
  toolState: EncounterSetsToolState | undefined;
  onToolStateChange: (state: EncounterSetsToolState) => void;
  campaignId: string;
}

function uid(): string {
  return crypto.randomUUID();
}

export function EncounterSets({ toolState, onToolStateChange, campaignId }: EncounterSetsProps) {
  const state = toolState ?? DEFAULT_ENCOUNTER_SETS_STATE;

  const patchState = useCallback(
    (patch: Partial<EncounterSetsToolState>) => onToolStateChange({ ...state, ...patch }),
    [state, onToolStateChange],
  );

  const {
    templates, folders, instances, loading,
    saveFolder, deleteFolder,
    saveInstance,
    resolveInstance,
  } = useBestiaryState(campaignId);

  // ── Selected folder for displaying cards ──
  const selectedFolderId = state.selectedInstanceId; // reuse field for folder selection

  const folderInstances = useMemo(() => {
    if (!selectedFolderId) return [];
    return instances.filter(i => i.folderId === selectedFolderId);
  }, [selectedFolderId, instances]);

  // ── Folder CRUD ──
  const handleAddFolder = useCallback((parentId: string | null, name: string) => {
    const id = uid();
    const maxOrder = folders
      .filter(f => f.parentId === parentId)
      .reduce((max, f) => Math.max(max, f.sortOrder), -1);
    saveFolder({ id, parentId, name, sortOrder: maxOrder + 1, createdAt: new Date().toISOString() });
    patchState({ expandedFolders: [...new Set([...state.expandedFolders, id])] });
  }, [folders, saveFolder, patchState, state.expandedFolders]);

  const handleRenameFolder = useCallback((id: string, name: string) => {
    const folder = folders.find(f => f.id === id);
    if (folder) saveFolder({ ...folder, name });
  }, [folders, saveFolder]);

  const handleDeleteFolder = useCallback((id: string) => {
    deleteFolder(id);
    patchState({ selectedInstanceId: null });
  }, [deleteFolder, patchState]);

  const handleToggleExpand = useCallback((id: string) => {
    const set = new Set(state.expandedFolders);
    if (set.has(id)) set.delete(id); else set.add(id);
    patchState({ expandedFolders: Array.from(set), selectedInstanceId: id });
  }, [state.expandedFolders, patchState]);

  // ── Instance CRUD ──
  const handleDropTemplate = useCallback((folderId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const maxOrder = instances
      .filter(i => i.folderId === folderId)
      .reduce((max, i) => Math.max(max, i.sortOrder), -1);
    saveInstance({
      id: uid(),
      folderId,
      templateId,
      instanceName: null,
      overrides: {},
      sortOrder: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
  }, [templates, instances, saveInstance]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; isOnMap: boolean; isInCombat: boolean } | null>(null);

  const handleDeleteInstance = useCallback(async (id: string) => {
    const api = window.electronAPI;
    if (!api) return;
    const deps = await api.bestiary.getInstanceDependents(id);
    if (deps && (deps.isOnMap || deps.isInCombat)) {
      setDeleteConfirm({ id, ...deps });
    } else {
      await api.bestiary.deleteInstanceCascade(id);
      if (state.selectedInstanceId === id) patchState({ selectedInstanceId: null });
      window.dispatchEvent(new CustomEvent('bestiary:data-changed'));
    }
  }, [state.selectedInstanceId, patchState]);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const api = window.electronAPI;
    if (!api) return;
    await api.bestiary.deleteInstanceCascade(deleteConfirm.id);
    if (state.selectedInstanceId === deleteConfirm.id) patchState({ selectedInstanceId: null });
    window.dispatchEvent(new CustomEvent('bestiary:instance-deleted', { detail: { instanceId: deleteConfirm.id } }));
    window.dispatchEvent(new CustomEvent('bestiary:data-changed'));
    setDeleteConfirm(null);
  }, [deleteConfirm, state.selectedInstanceId, patchState]);

  const handleDuplicateInstance = useCallback((id: string) => {
    const inst = instances.find(i => i.id === id);
    if (!inst) return;
    const maxOrder = instances
      .filter(i => i.folderId === inst.folderId)
      .reduce((max, i) => Math.max(max, i.sortOrder), -1);
    saveInstance({
      ...inst,
      id: uid(),
      instanceName: inst.instanceName ? `${inst.instanceName} (copy)` : null,
      sortOrder: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
  }, [instances, saveInstance]);

  const handleMoveInstance = useCallback((instanceId: string, targetFolderId: string) => {
    const inst = instances.find(i => i.id === instanceId);
    if (!inst || inst.folderId === targetFolderId) return;
    const maxOrder = instances
      .filter(i => i.folderId === targetFolderId)
      .reduce((max, i) => Math.max(max, i.sortOrder), -1);
    saveInstance({ ...inst, folderId: targetFolderId, sortOrder: maxOrder + 1 });
  }, [instances, saveInstance]);

  const handleUpdateInstance = useCallback((instance: CreatureInstance) => {
    saveInstance(instance);
  }, [saveInstance]);

  const handleMoveFolder = useCallback((folderId: string, targetParentId: string | null) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    let check: string | null = targetParentId;
    while (check) {
      if (check === folderId) return;
      const parent = folders.find(f => f.id === check);
      check = parent?.parentId ?? null;
    }
    saveFolder({ ...folder, parentId: targetParentId });
  }, [folders, saveFolder]);

  const handleSelectTree = useCallback((id: string, kind: 'folder' | 'instance') => {
    if (kind === 'folder') {
      patchState({ selectedInstanceId: id });
    } else {
      // When clicking an instance, select its parent folder
      const inst = instances.find(i => i.id === id);
      if (inst) patchState({ selectedInstanceId: inst.folderId });
    }
  }, [patchState, instances]);

  if (loading) {
    return <div className={styles.noSelection}>Loading encounter sets...</div>;
  }

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className={styles.container}>
      <div className={styles.body}>
        {/* Left: encounter groups */}
        <div className={styles.leftPanel}>
          <EncounterTreePanel
            folders={folders}
            instances={instances}
            templates={templates}
            selectedId={state.selectedInstanceId}
            expandedFolders={state.expandedFolders}
            onToggleExpand={handleToggleExpand}
            onSelect={handleSelectTree}
            onAddFolder={handleAddFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onDeleteInstance={handleDeleteInstance}
            onDuplicateInstance={handleDuplicateInstance}
            onDropTemplate={handleDropTemplate}
            onMoveInstance={handleMoveInstance}
            onMoveFolder={handleMoveFolder}
            onUpdateInstance={handleUpdateInstance}
            resolveInstance={resolveInstance}
          />
        </div>

        {/* Right: compact read-only creature cards */}
        <div className={styles.rightPanel}>
          {selectedFolder && folderInstances.length > 0 ? (
            <div className={styles.encounterCardsGrid}>
              {folderInstances.map(inst => (
                <CompactCreatureCard
                  key={inst.id}
                  instance={inst}
                  resolveInstance={resolveInstance}
                />
              ))}
            </div>
          ) : selectedFolder ? (
            <div className={styles.noSelection}>
              Drag creatures from the bestiary to add them to "{selectedFolder.name}"
            </div>
          ) : (
            <div className={styles.noSelection}>
              Select a folder to view its creatures
            </div>
          )}
        </div>
      </div>

      {/* Cascade delete confirmation dialog */}
      {deleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h4>Delete Instance?</h4>
            <p>This instance is currently active:</p>
            <ul>
              {deleteConfirm.isOnMap && <li>Placed on Map</li>}
              {deleteConfirm.isInCombat && <li>In Combat Tracker</li>}
            </ul>
            <p>Deleting will remove it from all modules.</p>
            <div className={styles.modalActions}>
              <button onClick={confirmDelete} className={styles.dangerBtn}>Delete</button>
              <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Compact Creature Card (read-only) ── */

function CompactCreatureCard({ instance, resolveInstance }: {
  instance: CreatureInstance;
  resolveInstance: (inst: CreatureInstance) => import('./types').CreatureTemplate | null;
}) {
  const resolved = resolveInstance(instance);
  if (!resolved) return null;

  const name = instance.instanceName ?? resolved.name;
  const fieldValues = resolved.fieldValues
    ? resolved.fieldValues as Record<string, FieldValue>
    : templateToFieldValues(resolved);

  // Extract key stats
  const crVal = fieldValues['cr'];
  const crText = crVal?.type === 'number' ? String(crVal.value) : crVal?.type === 'text-field' ? crVal.value : resolved.cr;
  const xp = getXpFromCr(crText);
  const pb = getProficiencyBonus(crText);

  const ac = resolved.ac;
  const hp = resolved.hpDefault;
  const hpFormula = resolved.hpFormula;
  const speed = resolved.speed;
  const abilities = resolved.abilityScores;
  const saves = resolved.savingThrows;
  const traits = resolved.traits;
  const actions = resolved.actions.filter(a => !a.isLegendary);
  const legendaryActions = resolved.actions.filter(a => a.isLegendary);
  const actionsText = resolved.actionsMode === 'freetext' ? resolved.actionsText : null;
  const tags = resolved.tags;

  // Extract additional field values for display
  const senses = fieldValues['senses'];
  const sensesText = senses?.type === 'text-field' ? senses.value : null;
  const languages = fieldValues['languages'];
  const languagesText = languages?.type === 'text-field' ? languages.value : null;
  const damageResistances = fieldValues['damage_resistances'];
  const resistancesText = damageResistances?.type === 'text-field' ? damageResistances.value : null;
  const damageImmunities = fieldValues['damage_immunities'];
  const immunitiesText = damageImmunities?.type === 'text-field' ? damageImmunities.value : null;
  const conditionImmunities = fieldValues['condition_immunities'];
  const conditionImmText = conditionImmunities?.type === 'text-field' ? conditionImmunities.value : null;
  const damageVulnerabilities = fieldValues['damage_vulnerabilities'];
  const vulnerabilitiesText = damageVulnerabilities?.type === 'text-field' ? damageVulnerabilities.value : null;

  return (
    <div className={styles.compactCard}>
      {/* Header row: avatar + name + CR */}
      <div className={styles.compactCardHeader}>
        <div className={styles.compactCardAvatar}>
          {resolved.avatarPath ? (
            <img src={resolved.avatarPath} alt={name} />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '24px', opacity: 0.5 }}>pets</span>
          )}
        </div>
        <div className={styles.compactCardTitle}>
          <span className={styles.compactCardName}>{name}</span>
          {resolved.creatureType && (
            <span className={styles.compactCardType}>{resolved.creatureType}</span>
          )}
        </div>
        {crText && (
          <div className={styles.compactCardCr}>
            <span className={styles.compactCardCrLabel}>CR</span>
            <span className={styles.compactCardCrValue}>{crText}</span>
          </div>
        )}
      </div>

      {/* Core stats row */}
      <div className={styles.compactCardStats}>
        {ac != null && (
          <div className={styles.compactStat}>
            <span className={styles.compactStatLabel}>AC</span>
            <span className={styles.compactStatValue}>{ac}</span>
          </div>
        )}
        {hp != null && (
          <div className={styles.compactStat}>
            <span className={styles.compactStatLabel}>HP</span>
            <span className={styles.compactStatValue}>{hp}{hpFormula ? ` (${hpFormula})` : ''}</span>
          </div>
        )}
        {speed && Object.keys(speed).length > 0 && (
          <div className={styles.compactStat}>
            <span className={styles.compactStatLabel}>Speed</span>
            <span className={styles.compactStatValue}>
              {Object.entries(speed).map(([k, v]) => k === 'walk' ? `${v}ft` : `${k} ${v}ft`).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Ability scores */}
      {abilities && (
        <div className={styles.compactCardAbilities}>
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(ab => {
            const val = abilities[ab];
            if (val == null) return null;
            const mod = Math.floor((val - 10) / 2);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            return (
              <div key={ab} className={styles.compactAbility}>
                <span className={styles.compactAbilityLabel}>{ab.toUpperCase()}</span>
                <span className={styles.compactAbilityValue}>{val}</span>
                <span className={styles.compactAbilityMod}>{modStr}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Saving throws */}
      {saves && Object.keys(saves).length > 0 && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Saving Throws</span>
          <span className={styles.compactSectionText}>
            {Object.entries(saves).map(([k, v]) => {
              const modStr = (v as number) >= 0 ? `+${v}` : `${v}`;
              return `${k.charAt(0).toUpperCase() + k.slice(1)} ${modStr}`;
            }).join(', ')}
          </span>
        </div>
      )}

      {/* Defenses */}
      {vulnerabilitiesText && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Vulnerabilities</span>
          <span className={styles.compactSectionText}>{vulnerabilitiesText}</span>
        </div>
      )}
      {resistancesText && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Resistances</span>
          <span className={styles.compactSectionText}>{resistancesText}</span>
        </div>
      )}
      {immunitiesText && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Immunities</span>
          <span className={styles.compactSectionText}>{immunitiesText}</span>
        </div>
      )}
      {conditionImmText && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Condition Immunities</span>
          <span className={styles.compactSectionText}>{conditionImmText}</span>
        </div>
      )}

      {/* Senses & Languages */}
      {sensesText && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Senses</span>
          <span className={styles.compactSectionText}>{sensesText}</span>
        </div>
      )}
      {languagesText && (
        <div className={styles.compactCardSection}>
          <span className={styles.compactSectionLabel}>Languages</span>
          <span className={styles.compactSectionText}>{languagesText}</span>
        </div>
      )}

      {/* XP / PB */}
      {crText && (
        <div className={styles.compactCardFooter}>
          <span>XP {formatXp(xp ?? 0)}</span>
          <span>PB +{pb}</span>
        </div>
      )}

      {/* Traits */}
      {traits.length > 0 && (
        <div className={styles.compactCardBlock}>
          <div className={styles.compactBlockTitle}>Traits</div>
          {traits.map(t => (
            <div key={t.id} className={styles.compactActionItem}>
              <span className={styles.compactActionName}>{t.name}.</span>{' '}
              <span className={styles.compactActionDesc}>{t.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {(actions.length > 0 || actionsText) && (
        <div className={styles.compactCardBlock}>
          <div className={styles.compactBlockTitle}>Actions</div>
          {actionsText ? (
            <div className={styles.compactActionDesc} style={{ whiteSpace: 'pre-wrap' }}>{actionsText}</div>
          ) : (
            actions.map(a => (
              <div key={a.id} className={styles.compactActionItem}>
                <span className={styles.compactActionName}>{a.name}.</span>{' '}
                {a.toHit != null && (
                  <span className={styles.compactActionHit}>+{a.toHit} to hit</span>
                )}
                {a.damage && (
                  <span className={styles.compactActionDmg}> ({a.damage})</span>
                )}
                {a.description && (
                  <>
                    {(a.toHit != null || a.damage) ? '. ' : ''}
                    <span className={styles.compactActionDesc}>{a.description}</span>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Legendary Actions */}
      {legendaryActions.length > 0 && (
        <div className={styles.compactCardBlock}>
          <div className={styles.compactBlockTitle}>Legendary Actions</div>
          {legendaryActions.map(a => (
            <div key={a.id} className={styles.compactActionItem}>
              <span className={styles.compactActionName}>{a.name}.</span>{' '}
              <span className={styles.compactActionDesc}>{a.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className={styles.compactCardTags}>
          {tags.map(tag => (
            <span key={tag} className={styles.compactTag}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

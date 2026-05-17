/*
 * EncounterSets — standalone tool for grouping creature instances
 * and customizing them individually.
 *
 * Left panel: encounter group cards (folders + instances).
 * Right panel: full instance editor (CreatureForm-like) for the selected instance.
 */

import { useCallback, useMemo } from 'react';
import { useBestiaryState } from './hooks/useBestiaryState';
import { useCreatureStructure } from './hooks/useCreatureStructure';
import { templateToFieldValues } from './templateConversion';
import { EncounterTreePanel } from './components/EncounterTreePanel';
import { InstanceForm } from './components/InstanceForm';
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

  const { structure } = useCreatureStructure(campaignId);

  const {
    templates, folders, instances, loading,
    saveFolder, deleteFolder,
    saveInstance, deleteInstance,
    resolveInstance,
  } = useBestiaryState();

  // ── Selected instance ──
  const selectedInstance = useMemo(() => {
    if (!state.selectedInstanceId) return null;
    return instances.find(i => i.id === state.selectedInstanceId) ?? null;
  }, [state.selectedInstanceId, instances]);

  const selectedResolved = useMemo(() => {
    if (!selectedInstance) return null;
    return resolveInstance(selectedInstance);
  }, [selectedInstance, resolveInstance]);

  // Build merged fieldValues for the selected instance
  const selectedFieldValues = useMemo(() => {
    if (!selectedResolved) return {};
    // Start with template's fieldValues (converted from old format if needed)
    const base = selectedResolved.fieldValues
      ? selectedResolved.fieldValues as Record<string, FieldValue>
      : templateToFieldValues(selectedResolved);
    // Instance-level fieldValues overrides (stored in overrides.fieldValues)
    const overrideVals = (selectedInstance?.overrides?.fieldValues ?? {}) as Record<string, FieldValue>;
    return { ...base, ...overrideVals };
  }, [selectedResolved, selectedInstance]);

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
    patchState({ expandedFolders: Array.from(set) });
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

  const handleDeleteInstance = useCallback((id: string) => {
    deleteInstance(id);
    if (state.selectedInstanceId === id) patchState({ selectedInstanceId: null });
  }, [deleteInstance, state.selectedInstanceId, patchState]);

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

  /** Update a single fieldValue override on the selected instance */
  const handleInstanceFieldChange = useCallback((fieldId: string, value: FieldValue) => {
    if (!selectedInstance) return;
    const existingOverrides = selectedInstance.overrides as Record<string, unknown>;
    const existingFieldValues = (existingOverrides.fieldValues ?? {}) as Record<string, FieldValue>;
    const nextOverrides = {
      ...existingOverrides,
      fieldValues: { ...existingFieldValues, [fieldId]: value },
    };
    saveInstance({ ...selectedInstance, overrides: nextOverrides });
  }, [selectedInstance, saveInstance]);

  /** Update instance name */
  const handleInstanceNameChange = useCallback((name: string) => {
    if (!selectedInstance) return;
    saveInstance({ ...selectedInstance, instanceName: name || null });
  }, [selectedInstance, saveInstance]);

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
    if (kind === 'instance') {
      patchState({ selectedInstanceId: id });
    }
  }, [patchState]);

  if (loading) {
    return <div className={styles.noSelection}>Loading encounter sets...</div>;
  }

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

        {/* Right: instance editor */}
        <div className={styles.rightPanel}>
          {selectedInstance && selectedResolved ? (
            <InstanceForm
              instance={selectedInstance}
              fieldValues={selectedFieldValues}
              resolvedName={selectedResolved.name}
              avatarPath={selectedResolved.avatarPath}
              structure={structure}
              onFieldChange={handleInstanceFieldChange}
              onNameChange={handleInstanceNameChange}
              onDelete={handleDeleteInstance}
            />
          ) : (
            <div className={styles.noSelection}>
              Select an instance from a group to edit its details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

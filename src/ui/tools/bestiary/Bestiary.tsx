/*
 * Bestiary — creature library tool.
 *
 * Left panel: creature list grouped by type.
 * Right panel: creature detail/edit form (dynamic fields).
 */

import { useCallback, useMemo } from 'react';
import { useBestiaryState } from './hooks/useBestiaryState';
import { useCreatureStructure } from './hooks/useCreatureStructure';
import { LibraryPanel } from './components/LibraryPanel';
import { FilterPanel } from './components/FilterPanel';
import { CreatureForm } from './components/CreatureForm';
import { createBlankTemplate, DEFAULT_FILTERS } from './types';
import { templateToFieldValues, fieldValuesToTemplate } from './templateConversion';
import type { BestiaryToolState, CreatureFilters } from './types';
import type { FieldValue } from '../../components/dynamic-fields';
import { DEFAULT_BESTIARY_STATE } from './types';
import styles from './Bestiary.module.css';

interface BestiaryProps {
  toolState: BestiaryToolState | undefined;
  onToolStateChange: (state: BestiaryToolState) => void;
  campaignId: string;
}

function uid(): string {
  return crypto.randomUUID();
}

export function Bestiary({ toolState, onToolStateChange, campaignId }: BestiaryProps) {
  const state = toolState ?? DEFAULT_BESTIARY_STATE;
  const { structure } = useCreatureStructure(campaignId);

  const patchState = useCallback(
    (patch: Partial<BestiaryToolState>) => onToolStateChange({ ...state, ...patch }),
    [state, onToolStateChange],
  );

  const {
    templates, loading,
    saveTemplate, deleteTemplate,
  } = useBestiaryState();

  // ── Selected template ──
  const selectedTemplate = useMemo(() => {
    if (state.selectedTemplateId) {
      return templates.find(t => t.id === state.selectedTemplateId) ?? null;
    }
    return null;
  }, [state.selectedTemplateId, templates]);

  // Convert old template to fieldValues for display (use stored fieldValues if available)
  const fieldValues = useMemo(() => {
    if (!selectedTemplate) return {};
    if (selectedTemplate.fieldValues) return selectedTemplate.fieldValues as Record<string, FieldValue>;
    return templateToFieldValues(selectedTemplate);
  }, [selectedTemplate]);

  // ── Template CRUD ──
  const handleAddTemplate = useCallback(() => {
    const t = createBlankTemplate(uid(), 'New Creature');
    saveTemplate(t);
    patchState({ selectedTemplateId: t.id });
  }, [saveTemplate, patchState]);

  const handleNameChange = useCallback((name: string) => {
    if (!selectedTemplate) return;
    saveTemplate({ ...selectedTemplate, name, updatedAt: new Date().toISOString() });
  }, [selectedTemplate, saveTemplate]);

  const handleFieldChange = useCallback((fieldId: string, value: FieldValue) => {
    if (!selectedTemplate) return;
    const updatedValues = { ...fieldValues, [fieldId]: value };
    // Save fieldValues directly + keep old columns in sync via conversion
    const updated = fieldValuesToTemplate(selectedTemplate, updatedValues);
    updated.fieldValues = updatedValues;
    saveTemplate(updated);
  }, [selectedTemplate, fieldValues, saveTemplate]);

  const handleDeleteTemplate = useCallback(() => {
    if (state.selectedTemplateId) {
      deleteTemplate(state.selectedTemplateId);
      patchState({ selectedTemplateId: null });
    }
  }, [state.selectedTemplateId, deleteTemplate, patchState]);

  const handleAvatarUpload = useCallback(async () => {
    const api = window.electronAPI;
    if (!api || !selectedTemplate) return;
    const filePath = await api.dialog.openImageFile();
    if (!filePath) return;
    const dataUrl = await api.dialog.readImage(filePath);
    if (dataUrl) {
      saveTemplate({ ...selectedTemplate, avatarPath: dataUrl, updatedAt: new Date().toISOString() });
    }
  }, [selectedTemplate, saveTemplate]);

  if (loading) {
    return <div className={styles.noSelection}>Loading bestiary...</div>;
  }

  const rightPanel = selectedTemplate ? (
    <CreatureForm
      name={selectedTemplate.name}
      avatarPath={selectedTemplate.avatarPath}
      fieldValues={fieldValues}
      structure={structure}
      onNameChange={handleNameChange}
      onFieldChange={handleFieldChange}
      onAvatarUpload={handleAvatarUpload}
      onDelete={handleDeleteTemplate}
    />
  ) : (
    <div className={styles.noSelection}>
      Select a creature from the library to view details
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Toolbar below window header */}
      <div className={styles.bestiaryToolbar}>
        <button
          className={styles.iconBtn}
          onClick={() => patchState({ listHidden: !state.listHidden })}
          title={state.listHidden ? 'Show creature list' : 'Hide creature list'}
        >
          <span className="material-symbols-outlined">{state.listHidden ? 'menu' : 'menu_open'}</span>
        </button>
        <button
          className={`${styles.iconBtn} ${state.filterPanelOpen ? styles.iconBtnActive : ''}`}
          onClick={() => patchState({ filterPanelOpen: !state.filterPanelOpen })}
          title="Advanced filters"
        >
          <span className="material-symbols-outlined">filter_alt</span>
        </button>
      </div>
      <div className={styles.body}>
        {/* Filter drawer — attached to left side */}
        {state.filterPanelOpen && (
          <div className={styles.filterPanel}>
            <FilterPanel
              filters={state.filters ?? DEFAULT_FILTERS}
              onChange={(filters: CreatureFilters) => patchState({ filters })}
              onClose={() => patchState({ filterPanelOpen: false })}
            />
          </div>
        )}
        {!state.listHidden && (
          <div className={styles.leftPanel}>
            <LibraryPanel
              templates={templates}
              selectedId={state.selectedTemplateId}
              onSelect={(id) => patchState({ selectedTemplateId: id })}
              onAdd={handleAddTemplate}
              searchQuery={state.searchQuery}
              onSearchChange={(q) => patchState({ searchQuery: q })}
              filters={state.filters ?? DEFAULT_FILTERS}
            />
          </div>
        )}
        <div className={styles.rightPanel}>
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

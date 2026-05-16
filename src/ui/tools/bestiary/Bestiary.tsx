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
import { CreatureForm } from './components/CreatureForm';
import { createBlankTemplate } from './types';
import { templateToFieldValues, fieldValuesToTemplate } from './templateConversion';
import type { BestiaryToolState } from './types';
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
      <div className={styles.body}>
        <div className={styles.leftPanel}>
          <LibraryPanel
            templates={templates}
            selectedId={state.selectedTemplateId}
            onSelect={(id) => patchState({ selectedTemplateId: id })}
            onAdd={handleAddTemplate}
            searchQuery={state.searchQuery}
            onSearchChange={(q) => patchState({ searchQuery: q })}
          />
        </div>
        <div className={styles.rightPanel}>
          {rightPanel}
        </div>
      </div>
    </div>
  );
}

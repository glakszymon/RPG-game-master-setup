/*
 * Bestiary — creature library tool.
 *
 * Left panel: creature list grouped by type.
 * Right panel: creature detail/edit form.
 */

import { useCallback, useMemo } from 'react';
import { useBestiaryState } from './hooks/useBestiaryState';
import { LibraryPanel } from './components/LibraryPanel';
import { CreatureForm } from './components/CreatureForm';
import { createBlankTemplate } from './types';
import type { BestiaryToolState, CreatureTemplate } from './types';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Bestiary({ toolState, onToolStateChange, campaignId: _campaignId }: BestiaryProps) {
  const state = toolState ?? DEFAULT_BESTIARY_STATE;

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

  // ── Template CRUD ──
  const handleAddTemplate = useCallback(() => {
    const t = createBlankTemplate(uid(), 'New Creature');
    saveTemplate(t);
    patchState({ selectedTemplateId: t.id });
  }, [saveTemplate, patchState]);

  const handleTemplateChange = useCallback((updated: CreatureTemplate) => {
    saveTemplate(updated);
  }, [saveTemplate]);

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
      template={selectedTemplate}
      onChange={handleTemplateChange}
      onDelete={handleDeleteTemplate}
      onAvatarUpload={handleAvatarUpload}
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

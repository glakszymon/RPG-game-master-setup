/*
 * NpcDetail — edit view for a single NPC.
 */

import { useState, useCallback } from 'react';
import type { Npc, NpcCustomFieldDef } from './types';
import styles from './NpcLibrary.module.css';

interface NpcDetailProps {
  npc: Npc;
  customFields: NpcCustomFieldDef[];
  campaignId: string;
  onBack: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}

export function NpcDetail({ npc, customFields, campaignId, onBack, onSave, onDelete }: NpcDetailProps) {
  const [form, setForm] = useState({ ...npc });
  const [tagsInput, setTagsInput] = useState(npc.tags.join(', '));

  const handleSave = useCallback(async () => {
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    await window.electronAPI?.npc.save(JSON.stringify({
      id: form.id,
      campaign_id: campaignId,
      name: form.name,
      type_role: form.typeRole,
      tags: JSON.stringify(tags),
      description: form.description,
      notes: form.notes,
      portrait_path: form.portraitPath,
      portrait_builtin: form.portraitBuiltin,
      field_values: JSON.stringify(form.fieldValues),
    }));
    onSave();
  }, [form, tagsInput, campaignId, onSave]);

  const handlePortraitUpload = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (filePath) {
      setForm((f) => ({ ...f, portraitPath: filePath, portraitBuiltin: null }));
    }
  }, []);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    setForm((f) => ({
      ...f,
      fieldValues: { ...f.fieldValues, [fieldName]: value },
    }));
  }, []);

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <button className={styles.saveBtn} onClick={handleSave}>Save</button>
        <button className={styles.deleteBtn} onClick={() => onDelete(npc.id)}>Delete</button>
      </div>

      <div className={styles.detailBody}>
        <div className={styles.portraitSection}>
          <div className={styles.portrait}>
            {form.portraitPath ? '🖼️' : '🧑'}
          </div>
          <button className={styles.uploadBtn} onClick={handlePortraitUpload}>
            Upload Portrait
          </button>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Type / Role</span>
          <input
            type="text"
            value={form.typeRole}
            onChange={(e) => setForm((f) => ({ ...f, typeRole: e.target.value }))}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Tags (comma-separated)</span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </label>

        {customFields.length > 0 && (
          <div className={styles.customFields}>
            <div className={styles.fieldLabel}>Custom Fields</div>
            {customFields.map((cf) => (
              <label key={cf.id} className={styles.field}>
                <span className={styles.fieldLabel}>{cf.fieldName}</span>
                <input
                  type={cf.fieldType === 'number' ? 'number' : 'text'}
                  value={form.fieldValues[cf.fieldName] ?? ''}
                  onChange={(e) => handleFieldChange(cf.fieldName, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

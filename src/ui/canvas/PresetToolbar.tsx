/*
 * PresetToolbar — fixed-position dropdown for managing focus presets.
 *
 * Positioned top-right, provides quick access to save/activate/manage presets.
 */

import { useState, useCallback } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { FocusPreset } from './types';
import styles from './PresetToolbar.module.css';

interface PresetToolbarProps {
  presets: FocusPreset[];
  onActivate: (presetId: string, clean?: boolean) => void;
  onSave: (name: string) => Promise<FocusPreset>;
  onDelete: (presetId: string) => void;
  onRename: (presetId: string, newName: string) => void;
  onOverwrite: (presetId: string) => void;
}

function PresetToolbar({
  presets,
  onActivate,
  onSave,
  onDelete,
  onRename,
  onOverwrite,
}: PresetToolbarProps) {
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    await onSave(saveName.trim());
    setSaveName('');
    setSaving(false);
  }, [saveName, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        setSaving(false);
        setSaveName('');
      }
    },
    [handleSave],
  );

  const userPresets = presets.filter((p) => !p.isAutoSave);
  const autoPreset = presets.find((p) => p.isAutoSave);

  return (
    <div className={styles.toolbar}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className={styles.trigger} title="Focus Presets">
            <span className={styles.icon}>◫</span>
            <span className={styles.label}>Presets</span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.content} sideOffset={4} align="end">
            {/* Auto-save preset */}
            {autoPreset && (
              <>
                <DropdownMenu.Item
                  className={styles.item}
                  onSelect={() => onActivate(autoPreset.id)}
                >
                  <span className={styles.itemIcon}>↺</span>
                  <span className={styles.itemName}>Last Setup</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={styles.separator} />
              </>
            )}

            {/* User presets */}
            {userPresets.map((preset, index) => (
              <DropdownMenu.Sub key={preset.id}>
                <DropdownMenu.SubTrigger className={styles.item}>
                  <span className={styles.itemShortcut}>
                    {index < 9 ? `⌃${index + 1}` : ''}
                  </span>
                  <span className={styles.itemName}>{preset.name}</span>
                  <span className={styles.chevron}>›</span>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent className={styles.subContent} sideOffset={4}>
                    <DropdownMenu.Item
                      className={styles.item}
                      onSelect={() => onActivate(preset.id)}
                    >
                      Activate (additive)
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.item}
                      onSelect={() => onActivate(preset.id, true)}
                    >
                      Clean activate
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className={styles.separator} />
                    <DropdownMenu.Item
                      className={styles.item}
                      onSelect={() => onOverwrite(preset.id)}
                    >
                      Overwrite with current
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.item}
                      onSelect={() => {
                        const newName = prompt('Rename preset:', preset.name);
                        if (newName?.trim()) onRename(preset.id, newName.trim());
                      }}
                    >
                      Rename
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className={styles.itemDanger}
                      onSelect={() => onDelete(preset.id)}
                    >
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            ))}

            {userPresets.length === 0 && (
              <DropdownMenu.Item className={styles.itemDisabled} disabled>
                No saved presets
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Separator className={styles.separator} />

            {/* Save new preset */}
            {saving ? (
              <div className={styles.saveInput}>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Preset name..."
                  autoFocus
                  className={styles.input}
                />
              </div>
            ) : (
              <DropdownMenu.Item
                className={styles.item}
                onSelect={(e) => {
                  e.preventDefault();
                  setSaving(true);
                }}
              >
                <span className={styles.itemIcon}>+</span>
                <span className={styles.itemName}>Save current layout...</span>
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export { PresetToolbar };

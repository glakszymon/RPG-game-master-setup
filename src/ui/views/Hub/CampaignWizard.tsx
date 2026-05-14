import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { CampaignData } from '../../electron.d';
import styles from './CampaignWizard.module.css';

const PRESET_ICONS = [
  { value: 'sword', emoji: '\u2694\uFE0F', label: 'Sword' },
  { value: 'dragon', emoji: '\uD83D\uDC09', label: 'Dragon' },
  { value: 'castle', emoji: '\uD83C\uDFF0', label: 'Castle' },
  { value: 'forest', emoji: '\uD83C\uDF32', label: 'Forest' },
  { value: 'skull', emoji: '\uD83D\uDC80', label: 'Skull' },
  { value: 'gem', emoji: '\uD83D\uDC8E', label: 'Gem' },
  { value: 'shield', emoji: '\uD83D\uDEE1\uFE0F', label: 'Shield' },
  { value: 'scroll', emoji: '\uD83D\uDCDC', label: 'Scroll' },
  { value: 'fire', emoji: '\uD83D\uDD25', label: 'Fire' },
  { value: 'star', emoji: '\u2B50', label: 'Star' },
];

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, system: string, iconType: string, iconValue: string) => void;
  /** If provided, we're editing an existing campaign */
  editData?: CampaignData | null;
}

/**
 * CampaignWizard — modal for creating or editing a campaign.
 *
 * Minimal form: name, system (RPG system), icon picker (presets + custom upload).
 */
function CampaignWizard({ open, onClose, onSave, editData }: CampaignWizardProps) {
  const [name, setName] = useState(editData?.name ?? '');
  const [system, setSystem] = useState(editData?.system ?? '');
  const [iconType, setIconType] = useState<'preset' | 'custom'>(
    (editData?.icon_type as 'preset' | 'custom') ?? 'preset',
  );
  const [iconValue, setIconValue] = useState(editData?.icon_value ?? 'sword');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), system.trim(), iconType, iconValue);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setIconType('custom');
    setIconValue(url);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            {editData ? 'Edit Campaign' : 'New Campaign'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Name */}
            <label className={styles.label}>
              <span>Campaign Name</span>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Curse of Strahd"
                autoFocus
              />
            </label>

            {/* System */}
            <label className={styles.label}>
              <span>RPG System</span>
              <input
                className={styles.input}
                type="text"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="e.g. D&D 5e, Pathfinder 2e"
              />
            </label>

            {/* Icon Picker */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Icon</legend>
              <div className={styles.iconGrid}>
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon.value}
                    type="button"
                    className={`${styles.iconBtn} ${iconType === 'preset' && iconValue === icon.value ? styles.iconBtnActive : ''}`}
                    onClick={() => { setIconType('preset'); setIconValue(icon.value); }}
                    title={icon.label}
                  >
                    {icon.emoji}
                  </button>
                ))}
              </div>
              <label className={styles.uploadLabel}>
                <span>Or upload custom image</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className={styles.fileInput} />
              </label>
            </fieldset>

            {/* Actions */}
            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={!name.trim()}>
                {editData ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CampaignWizard };

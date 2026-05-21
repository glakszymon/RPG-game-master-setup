import { useState, useEffect } from 'react';
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

/** Party member entry during wizard onboarding */
interface PartyMemberEntry {
  id: string;
  name: string;
}

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, system: string, iconType: string, iconValue: string) => Promise<string | void>;
  /** If provided, we're editing an existing campaign (no step 2) */
  editData?: CampaignData | null;
}

/**
 * CampaignWizard — multi-step modal for creating campaigns (guided onboarding).
 *
 * Step 1 (required): name, system, icon picker.
 * Step 2 (skippable): add party members — shows what the party tracker can do.
 * In edit mode, only Step 1 is shown.
 */
function CampaignWizard({ open, onClose, onSave, editData }: CampaignWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(editData?.name ?? '');
  const [system, setSystem] = useState(editData?.system ?? '');
  const [iconType, setIconType] = useState<'preset' | 'custom'>(
    (editData?.icon_type as 'preset' | 'custom') ?? 'preset',
  );
  const [iconValue, setIconValue] = useState(editData?.icon_value ?? 'sword');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [tileBackground, setTileBackground] = useState<string | null>(null);
  const [tileBackgroundPreview, setTileBackgroundPreview] = useState<string | null>(null);

  // Step 2: party members
  const [members, setMembers] = useState<PartyMemberEntry[]>([]);

  // Load existing tile background in edit mode
  useEffect(() => {
    if (!editData || !open) return;
    const api = window.electronAPI;
    if (!api) return;
    api.settings.load(editData.id, 'background_image').then((json: string | null) => {
      if (!json) return;
      const path = JSON.parse(json) as string;
      setTileBackground(path);
      api.dialog.readImage(path).then((dataUrl: string | null) => {
        if (dataUrl) setTileBackgroundPreview(dataUrl);
      });
    });
  }, [editData, open]);

  const resetForm = () => {
    setStep(1);
    setName(editData?.name ?? '');
    setSystem(editData?.system ?? '');
    setIconType((editData?.icon_type as 'preset' | 'custom') ?? 'preset');
    setIconValue(editData?.icon_value ?? 'sword');
    setCampaignId(null);
    setTileBackground(null);
    setTileBackgroundPreview(null);
    setMembers([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editData) {
      // Edit mode — save and persist tile background if changed
      await onSave(name.trim(), system.trim(), iconType, iconValue);
      if (tileBackground !== null) {
        const api = window.electronAPI;
        if (api) {
          await api.settings.save(editData.id, 'background_image', JSON.stringify(tileBackground));
        }
      }
      handleClose();
      return;
    }

    // Create campaign and advance to step 2
    const id = await onSave(name.trim(), system.trim(), iconType, iconValue);
    if (id) {
      setCampaignId(id);
      // Save tile background setting
      if (tileBackground) {
        const api = window.electronAPI;
        if (api) {
          await api.settings.save(id, 'background_image', JSON.stringify(tileBackground));
        }
      }
    }
    setStep(2);
  };

  const handleAddMember = () => {
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '' },
    ]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMemberChange = (id: string, value: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: value } : m)),
    );
  };

  const handleStep2Submit = async () => {
    const validMembers = members.filter((m) => m.name.trim());
    if (validMembers.length > 0 && campaignId) {
      const api = window.electronAPI;
      if (api) {
        // Save as party tracker Character[] format
        const characters = validMembers.map((m, i) => ({
          id: m.id,
          name: m.name.trim(),
          portraitPath: null,
          fieldValues: {},
          order: i,
        }));
        await api.settings.save(
          campaignId,
          'initial_party_members',
          JSON.stringify(characters),
        );
      }
    }
    handleClose();
  };

  const handleSkipStep2 = () => {
    handleClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setIconType('custom');
    setIconValue(url);
  };

  const handlePickTileBackground = async () => {
    const api = window.electronAPI;
    if (!api) return;
    const filePath = await api.dialog.openImageFile();
    if (!filePath) return;
    setTileBackground(filePath);
    const dataUrl = await api.dialog.readImage(filePath);
    if (dataUrl) {
      setTileBackgroundPreview(dataUrl);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          {/* Step indicator (only for create mode) */}
          {!editData && (
            <div className={styles.stepIndicator}>
              <div className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`} />
              <div className={styles.stepLine} />
              <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`} />
            </div>
          )}

          <Dialog.Title className={styles.title}>
            {editData ? 'Edit Campaign' : step === 1 ? 'New Campaign' : 'Add Party Members'}
          </Dialog.Title>

          {step === 2 && !editData && (
            <p className={styles.stepHint}>
              Optional: add your party members now, or skip and do it later on the canvas.
            </p>
          )}

          {/* Step 1: Name, System, Icon */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className={styles.form}>
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

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Tile Background</legend>
                <div className={styles.tileBackgroundPicker}>
                  {tileBackgroundPreview ? (
                    <div
                      className={styles.tileBackgroundPreviewBox}
                      style={{ backgroundImage: `url(${tileBackgroundPreview})` }}
                    />
                  ) : (
                    <div className={styles.tileBackgroundPlaceholder}>No image</div>
                  )}
                  <button type="button" className={styles.addMemberBtn} onClick={handlePickTileBackground}>
                    Choose Image
                  </button>
                  {tileBackground && (
                    <button
                      type="button"
                      className={styles.removeMemberBtn}
                      onClick={() => { setTileBackground(null); setTileBackgroundPreview(null); }}
                      title="Remove background"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </fieldset>

              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={!name.trim()}>
                  {editData ? 'Save' : 'Next'}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Party Members */}
          {step === 2 && !editData && (
            <div className={styles.form}>
              <div className={styles.membersList}>
                {members.map((member) => (
                  <div key={member.id} className={styles.memberRow}>
                    <input
                      className={styles.input}
                      type="text"
                      value={member.name}
                      onChange={(e) => handleMemberChange(member.id, e.target.value)}
                      placeholder="Player name"
                    />
                    <button
                      type="button"
                      className={styles.removeMemberBtn}
                      onClick={() => handleRemoveMember(member.id)}
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" className={styles.addMemberBtn} onClick={handleAddMember}>
                + Add Member
              </button>

              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={handleSkipStep2}>
                  Skip
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleStep2Submit}
                  disabled={members.filter((m) => m.name.trim()).length === 0}
                >
                  Finish
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CampaignWizard };

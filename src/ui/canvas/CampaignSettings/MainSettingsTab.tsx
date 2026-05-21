import { useState, useEffect, useCallback } from 'react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import styles from './CampaignSettings.module.css';
import type { CampaignData } from '../../electron.d';

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

interface MainSettingsTabProps {
  campaignId: string;
  onClose: () => void;
}

function MainSettingsTab({ campaignId, onClose }: MainSettingsTabProps) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [iconValue, setIconValue] = useState('sword');
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load campaign data on mount
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.campaigns.list().then((campaigns) => {
      const found = campaigns.find((c) => c.id === campaignId);
      if (found) {
        setCampaign(found);
        setName(found.name);
        setSystem(found.system);
        setIconValue(found.icon_value);
      }
    });

    // Load background image setting
    api.settings.load(campaignId, 'background_image').then((json) => {
      if (json) {
        const path = JSON.parse(json) as string;
        if (path) {
          api.dialog.readImage(path).then((dataUrl) => {
            if (dataUrl) setBackgroundPreview(dataUrl);
          });
        }
      }
    });
  }, [campaignId]);

  const handlePickBackground = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    const filePath = await api.dialog.openImageFile();
    if (!filePath) return;

    // Save the path to settings
    await api.settings.save(campaignId, 'background_image', JSON.stringify(filePath));

    // Load preview
    const dataUrl = await api.dialog.readImage(filePath);
    if (dataUrl) setBackgroundPreview(dataUrl);
  }, [campaignId]);

  const handleRemoveBackground = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    await api.settings.save(campaignId, 'background_image', JSON.stringify(null));
    setBackgroundPreview(null);
  }, [campaignId]);

  const handleSave = async () => {
    const api = window.electronAPI;
    if (!api || !name.trim()) return;

    setSaving(true);
    setError('');
    try {
      const result = await api.campaigns.update(
        campaignId,
        name.trim(),
        system.trim(),
        campaign?.icon_type ?? 'preset',
        iconValue,
      );
      if (result?.ok) {
        onClose();
      } else {
        setError('Failed to save settings');
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.mainTab}>
      <Input
        label="Campaign Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Curse of Strahd"
      />

      <Input
        label="RPG System"
        value={system}
        onChange={(e) => setSystem(e.target.value)}
        placeholder="e.g. D&D 5e, Pathfinder 2e"
      />

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Icon</legend>
        <div className={styles.iconGrid}>
          {PRESET_ICONS.map((icon) => (
            <button
              key={icon.value}
              type="button"
              className={`${styles.iconBtn} ${iconValue === icon.value ? styles.iconBtnActive : ''}`}
              onClick={() => setIconValue(icon.value)}
              title={icon.label}
            >
              {icon.emoji}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Background Image */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Campaign Background</legend>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: '0 0 8px' }}>
          Displayed as background on the Hub screen.
        </p>
        {backgroundPreview && (
          <div className={styles.backgroundPreview}>
            <img src={backgroundPreview} alt="Campaign background" className={styles.backgroundImg} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={handlePickBackground}>
            {backgroundPreview ? 'Change Image' : 'Select Image'}
          </Button>
          {backgroundPreview && (
            <Button variant="secondary" onClick={handleRemoveBackground}>
              Remove
            </Button>
          )}
        </div>
      </fieldset>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

export { MainSettingsTab };

import { useState, useEffect, useCallback } from 'react';
import type { CampaignData } from '../../electron.d';
import { CampaignCard } from './CampaignCard';
import { CampaignWizard } from './CampaignWizard';
import iconBg from '../../../../assets/icon.png';
import styles from './Hub.module.css';

interface HubProps {
  onOpenCampaign: (campaignId: string) => void;
  onOpenMapCreator: () => void;
}

/**
 * Hub — application home screen.
 *
 * Full-screen grid of campaign cards with a header containing
 * the app title and Map Creator button.
 */
function Hub({ onOpenCampaign, onOpenMapCreator }: HubProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignData | null>(null);
  const [cardBackgrounds, setCardBackgrounds] = useState<Record<string, string>>({});

  const loadCampaigns = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;
    const list = await api.campaigns.list();
    setCampaigns(list);
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Load per-card background images
  useEffect(() => {
    const api = window.electronAPI;
    if (!api || campaigns.length === 0) return;

    const loadBgs = async () => {
      const bgs: Record<string, string> = {};
      for (const c of campaigns) {
        const json = await api.settings.load(c.id, 'background_image');
        if (!json) continue;
        const path = JSON.parse(json) as string | null;
        if (!path) continue;
        const dataUrl = await api.dialog.readImage(path);
        if (dataUrl) bgs[c.id] = dataUrl;
      }
      setCardBackgrounds(bgs);
    };
    loadBgs();
  }, [campaigns]);

  const handleDelete = async (id: string) => {
    const api = window.electronAPI;
    if (!api) return;
    await api.campaigns.delete(id);
    await loadCampaigns();
  };

  const handleArchive = async (campaign: CampaignData) => {
    const api = window.electronAPI;
    if (!api) return;
    const newStatus = campaign.status === 'archived' ? 'active' : 'archived';
    await api.campaigns.updateStatus(campaign.id, newStatus);
    await loadCampaigns();
  };

  const handleOpenCampaign = async (id: string) => {
    const api = window.electronAPI;
    if (api) await api.campaigns.touch(id);
    onOpenCampaign(id);
  };

  return (
    <div
      className={styles.hub}
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${iconBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>Game Master Panel</h1>
        <button className={styles.mapCreatorBtn} onClick={onOpenMapCreator}>
          Map Creator
        </button>
      </header>

      <main className={styles.grid}>
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            backgroundUrl={cardBackgrounds[campaign.id]}
            onClick={() => handleOpenCampaign(campaign.id)}
            onEdit={() => setEditingCampaign(campaign)}
            onArchive={() => handleArchive(campaign)}
            onDelete={() => handleDelete(campaign.id)}
          />
        ))}

        <button
          className={styles.newCampaignCard}
          onClick={() => setShowWizard(true)}
        >
          <span className={styles.plusIcon}>+</span>
          <span>New Campaign</span>
        </button>
      </main>

      {/* Campaign Wizard / Edit Modal */}
      <CampaignWizard
        open={showWizard || editingCampaign !== null}
        onClose={() => { setShowWizard(false); setEditingCampaign(null); loadCampaigns(); }}
        editData={editingCampaign}
        onSave={async (name, system, iconType, iconValue) => {
          const api = window.electronAPI;
          if (!api) return;
          if (editingCampaign) {
            await api.campaigns.update(editingCampaign.id, name, system, iconType, iconValue);
            return;
          }
          const id = crypto.randomUUID();
          await api.campaigns.create(id, name, system, iconType, iconValue);
          return id;
        }}
      />
    </div>
  );
}

export { Hub };
export type { HubProps };

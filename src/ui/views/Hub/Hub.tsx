import { useState, useEffect, useCallback } from 'react';
import type { CampaignData } from '../../electron.d';
import { CampaignCard } from './CampaignCard';
import { CampaignWizard } from './CampaignWizard';
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

  const loadCampaigns = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;
    const list = await api.campaigns.list();
    setCampaigns(list);
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

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
    <div className={styles.hub}>
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
        onClose={() => { setShowWizard(false); setEditingCampaign(null); }}
        editData={editingCampaign}
        onSave={async (name, system, iconType, iconValue) => {
          const api = window.electronAPI;
          if (!api) return;
          if (editingCampaign) {
            await api.campaigns.update(editingCampaign.id, name, system, iconType, iconValue);
          } else {
            const id = crypto.randomUUID();
            await api.campaigns.create(id, name, system, iconType, iconValue);
          }
          setShowWizard(false);
          setEditingCampaign(null);
          await loadCampaigns();
        }}
      />
    </div>
  );
}

export { Hub };
export type { HubProps };

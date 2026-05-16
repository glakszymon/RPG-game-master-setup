import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Modal } from '../../components/Modal/Modal';
import { MainSettingsTab } from './MainSettingsTab';
import { CreatureFormTab } from './CreatureFormTab';
import { PlaceholderTab } from './PlaceholderTab';
import styles from './CampaignSettings.module.css';

interface CampaignSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

function CampaignSettings({ open, onOpenChange, campaignId }: CampaignSettingsProps) {
  const [activeTab, setActiveTab] = useState('main');
  const isWide = activeTab === 'creature-form';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Campaign Settings"
      contentClassName={`${styles.modalContent} ${isWide ? styles.modalWide : ''}`}
    >
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} orientation="vertical" className={styles.tabs}>
        <Tabs.List className={styles.tabList}>
          <Tabs.Trigger value="main" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">tune</span>
            Main
          </Tabs.Trigger>
          <Tabs.Trigger value="creature-form" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">pets</span>
            Creature Form
          </Tabs.Trigger>
          <Tabs.Trigger value="segments" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">category</span>
            Segments
          </Tabs.Trigger>
          <Tabs.Trigger value="instructions" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">draft</span>
            Instructions
          </Tabs.Trigger>
          <Tabs.Trigger value="technical" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">bolt</span>
            Technical
          </Tabs.Trigger>
        </Tabs.List>

        <div className={styles.tabContentArea}>
          <Tabs.Content value="main" className={styles.tabContent}>
            <MainSettingsTab
              campaignId={campaignId}
              onClose={() => onOpenChange(false)}
            />
          </Tabs.Content>

          <Tabs.Content value="creature-form" className={styles.tabContent}>
            <CreatureFormTab campaignId={campaignId} />
          </Tabs.Content>

          <Tabs.Content value="segments" className={styles.tabContent}>
            <PlaceholderTab label="Segment Settings" />
          </Tabs.Content>

          <Tabs.Content value="instructions" className={styles.tabContent}>
            <PlaceholderTab label="Instructions" />
          </Tabs.Content>

          <Tabs.Content value="technical" className={styles.tabContent}>
            <PlaceholderTab label="Technical Panel" />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Modal>
  );
}

export { CampaignSettings };

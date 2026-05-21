import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Modal } from '../../components/Modal/Modal';
import { MainSettingsTab } from './MainSettingsTab';
import { CreatureFormTab } from './CreatureFormTab';
import { PartyTrackerSettingsTab } from './PartyTrackerSettingsTab';
import { TimeClockSettingsTab } from './TimeClockSettingsTab';
import { CalendarSettingsTab } from './CalendarSettingsTab';
import { PlaceholderTab } from './PlaceholderTab';
import styles from './CampaignSettings.module.css';
import type { CampaignTimeState } from '../../canvas/types';
import type { PartyTrackerState } from '../../tools/party-tracker/types';

interface CampaignSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  timeState: CampaignTimeState;
  onSetTimeState: (timeState: CampaignTimeState) => void;
  partyState: PartyTrackerState | undefined;
  onPartyStateChange: (state: PartyTrackerState) => void;
}

function CampaignSettings({
  open,
  onOpenChange,
  campaignId,
  timeState,
  onSetTimeState,
  partyState,
  onPartyStateChange,
}: CampaignSettingsProps) {
  const [activeTab, setActiveTab] = useState('main');
  const isWide = activeTab === 'creature-form' || activeTab === 'calendar' || activeTab === 'party-tracker';

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
          <Tabs.Trigger value="party-tracker" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">group</span>
            Party Tracker
          </Tabs.Trigger>
          <Tabs.Trigger value="time-clock" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">schedule</span>
            Time Clock
          </Tabs.Trigger>
          <Tabs.Trigger value="calendar" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">calendar_month</span>
            Calendar
          </Tabs.Trigger>
          <Tabs.Trigger value="instructions" className={styles.tabTrigger}>
            <span className="material-symbols-outlined">draft</span>
            Instructions
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

          <Tabs.Content value="party-tracker" className={styles.tabContent}>
            <PartyTrackerSettingsTab
              partyState={partyState}
              onPartyStateChange={onPartyStateChange}
            />
          </Tabs.Content>

          <Tabs.Content value="time-clock" className={styles.tabContent}>
            <TimeClockSettingsTab
              timeState={timeState}
              onSetTimeState={onSetTimeState}
            />
          </Tabs.Content>

          <Tabs.Content value="calendar" className={styles.tabContent}>
            <CalendarSettingsTab
              timeState={timeState}
              onSetTimeState={onSetTimeState}
            />
          </Tabs.Content>

          <Tabs.Content value="instructions" className={styles.tabContent}>
            <PlaceholderTab label="Instructions" />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </Modal>
  );
}

export { CampaignSettings };

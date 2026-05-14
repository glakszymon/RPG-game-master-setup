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
  return (
    <div className={styles.hub}>
      <header className={styles.header}>
        <h1 className={styles.title}>Game Master Panel</h1>
        <button className={styles.mapCreatorBtn} onClick={onOpenMapCreator}>
          Map Creator
        </button>
      </header>

      <main className={styles.grid}>
        {/* Campaign cards will go here in Phase 3 */}
        <button
          className={styles.newCampaignCard}
          onClick={() => onOpenCampaign('demo')}
        >
          <span className={styles.plusIcon}>+</span>
          <span>New Campaign</span>
        </button>
      </main>
    </div>
  );
}

export { Hub };
export type { HubProps };

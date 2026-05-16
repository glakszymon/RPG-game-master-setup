import styles from './CampaignSettings.module.css';

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className={styles.placeholder}>
      <p className={styles.placeholderText}>{label}</p>
      <p className={styles.placeholderSub}>Coming soon</p>
    </div>
  );
}

export { PlaceholderTab };

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { CampaignData } from '../../electron.d';
import styles from './CampaignCard.module.css';

interface CampaignCardProps {
  campaign: CampaignData;
  onClick: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

/**
 * CampaignCard — displays campaign info in the Hub grid.
 *
 * Shows icon, name, system, last session date, and status badge.
 * Three-dots menu provides edit/archive/delete actions.
 */
function CampaignCard({ campaign, onClick, onEdit, onArchive, onDelete }: CampaignCardProps) {
  const lastSession = new Date(campaign.last_session_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={styles.card} onClick={onClick}>
      {/* Three-dots menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className={styles.menuTrigger}
            onClick={(e) => e.stopPropagation()}
            aria-label="Campaign actions"
          >
            &#x2026;
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.menuContent} sideOffset={4} onClick={(e) => e.stopPropagation()}>
            <DropdownMenu.Item className={styles.menuItem} onSelect={onEdit}>
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item className={styles.menuItem} onSelect={onArchive}>
              {campaign.status === 'archived' ? 'Unarchive' : 'Archive'}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className={styles.menuSeparator} />
            <DropdownMenu.Item className={`${styles.menuItem} ${styles.menuItemDanger}`} onSelect={onDelete}>
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Icon */}
      <div className={styles.icon}>
        {campaign.icon_type === 'preset' ? (
          <span className={styles.presetIcon}>{getPresetEmoji(campaign.icon_value)}</span>
        ) : (
          <img src={campaign.icon_value} alt="" className={styles.customIcon} />
        )}
      </div>

      {/* Info */}
      <h3 className={styles.name}>{campaign.name}</h3>
      {campaign.system && <p className={styles.system}>{campaign.system}</p>}

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.date}>{lastSession}</span>
        {campaign.status === 'archived' && (
          <span className={styles.badge}>Archived</span>
        )}
      </div>
    </div>
  );
}

function getPresetEmoji(value: string): string {
  const map: Record<string, string> = {
    sword: '\u2694\uFE0F',
    dragon: '\uD83D\uDC09',
    castle: '\uD83C\uDFF0',
    forest: '\uD83C\uDF32',
    skull: '\uD83D\uDC80',
    gem: '\uD83D\uDC8E',
    shield: '\uD83D\uDEE1\uFE0F',
    scroll: '\uD83D\uDCDC',
    fire: '\uD83D\uDD25',
    star: '\u2B50',
  };
  return map[value] ?? '\u2694\uFE0F';
}

export { CampaignCard };

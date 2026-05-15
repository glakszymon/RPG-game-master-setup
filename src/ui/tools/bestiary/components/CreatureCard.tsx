/*
 * CreatureCard — compact card for a creature in the library list.
 * Draggable to encounter tree to create instances.
 */

import type { CreatureTemplate } from '../types';
import { CREATURE_TYPE_ICON, getCrColor } from '../types';
import styles from '../Bestiary.module.css';

interface CreatureCardProps {
  template: CreatureTemplate;
  selected: boolean;
  onClick: () => void;
}

export function CreatureCard({ template, selected, onClick }: CreatureCardProps) {
  const iconName = template.creatureType ? CREATURE_TYPE_ICON[template.creatureType] : 'category';
  const meta = [
    template.creatureType,
    template.cr ? `CR ${template.cr}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className={`${styles.creatureCard} ${selected ? styles.creatureCardSelected : ''}`}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/bestiary-template', JSON.stringify({
          templateId: template.id,
        }));
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className={styles.creatureAvatar}>
        {template.avatarPath ? (
          <img src={template.avatarPath} alt={template.name} />
        ) : (
          <span className={styles.icon}>{iconName}</span>
        )}
      </div>
      <div className={styles.creatureInfo}>
        <div className={styles.creatureName}>{template.name}</div>
        {meta && <div className={styles.creatureMeta}>{meta}</div>}
      </div>
      {template.cr && (
        <span className={styles.crBadge} style={{ color: getCrColor(template.cr) }}>
          {template.cr}
        </span>
      )}
    </div>
  );
}

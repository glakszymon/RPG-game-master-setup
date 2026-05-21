import type { PlayerCombatState } from './types';
import styles from './InitiativeOverlay.module.css';

interface InitiativeOverlayProps {
  combat: PlayerCombatState;
}

export function InitiativeOverlay({ combat }: InitiativeOverlayProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.title}>Initiative</span>
          <span className={styles.round}>Round {combat.currentRound}</span>
        </div>
        <ul className={styles.list}>
          {combat.combatants.map((c, i) => (
            <li
              key={c.id}
              className={`${styles.combatant} ${i === combat.activeCombatantIndex ? styles.active : ''}`}
            >
              {c.portraitUrl && (
                <img
                  src={c.portraitUrl}
                  alt=""
                  className={styles.portrait}
                />
              )}
              <span className={styles.name}>{c.name}</span>
              {c.initiative !== null && (
                <span className={styles.initiative}>{c.initiative}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/*
 * SlashCommandsMenu — Floating popup for slash commands.
 */

import { useEffect, useRef } from 'react';
import type { SlashCommandItem } from '../extensions/SlashCommands';
import styles from './SlashCommandsMenu.module.css';

interface SlashCommandsMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  selectedIndex?: number;
}

export function SlashCommandsMenu({ items, command, selectedIndex = 0 }: SlashCommandsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const safeIndex = selectedIndex >= items.length ? 0 : selectedIndex;

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const active = menu.children[safeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  if (items.length === 0) return null;

  return (
    <div className={styles.menu} ref={menuRef}>
      {items.map((item, i) => (
        <button
          key={item.title}
          className={`${styles.item} ${i === safeIndex ? styles.selected : ''}`}
          onMouseDown={e => e.preventDefault()}
          onClick={() => command(item)}
        >
          <span className={styles.icon}>{item.icon}</span>
          <div className={styles.text}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.description}>{item.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

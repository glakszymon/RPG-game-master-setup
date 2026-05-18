/*
 * SlashCommandsMenu — Floating popup for slash commands.
 */

import { useState } from 'react';
import type { SlashCommandItem } from '../extensions/SlashCommands';
import styles from './SlashCommandsMenu.module.css';

interface SlashCommandsMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export function SlashCommandsMenu({ items, command }: SlashCommandsMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp selectedIndex if items shrink
  const safeIndex = selectedIndex >= items.length ? 0 : selectedIndex;

  if (items.length === 0) return null;

  return (
    <div className={styles.menu}>
      {items.map((item, i) => (
        <button
          key={item.title}
          className={`${styles.item} ${i === safeIndex ? styles.selected : ''}`}
          onClick={() => command(item)}
          onMouseEnter={() => setSelectedIndex(i)}
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

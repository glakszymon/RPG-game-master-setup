/*
 * EncounterGroup — framed card/panel for encounter set folders.
 * Each folder renders as a bordered glass card with its creature instances inside.
 * Instances show short unique IDs in mono font and support inline editing.
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { CreatureTemplate, CreatureInstance, TreeNodeData } from '../types';
import { CREATURE_TYPE_ICON, getCrColor } from '../types';
import styles from '../Bestiary.module.css';

/* ── Instance Row ── */

interface InstanceRowProps {
  instance: CreatureInstance;
  resolved: CreatureTemplate | null;
  selected: boolean;
  onSelect: (id: string, kind: 'instance') => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateInstance: (instance: CreatureInstance) => void;
}

function InstanceRow({
  instance, resolved, selected, onSelect, onDelete, onDuplicate, onUpdateInstance,
}: InstanceRowProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHp, setEditHp] = useState('');

  const name = instance.instanceName ?? resolved?.name ?? 'Unknown';
  const cr = resolved?.cr ?? null;
  const iconName = resolved?.creatureType ? CREATURE_TYPE_ICON[resolved.creatureType] : 'category';
  const shortId = instance.id.slice(0, 6);

  const hpOverride = instance.overrides.hpDefault as number | undefined;
  const hp = hpOverride ?? resolved?.hpDefault ?? null;

  const startEdit = useCallback(() => {
    setEditName(instance.instanceName ?? '');
    setEditHp(hpOverride != null ? String(hpOverride) : '');
    setEditing(true);
  }, [instance.instanceName, hpOverride]);

  const commitEdit = useCallback(() => {
    const newName = editName.trim() || null;
    const newHp = editHp.trim() ? Number(editHp.trim()) : undefined;
    const overrides = { ...instance.overrides };
    if (newHp != null && !isNaN(newHp)) {
      overrides.hpDefault = newHp;
    } else {
      delete overrides.hpDefault;
    }
    onUpdateInstance({ ...instance, instanceName: newName, overrides });
    setEditing(false);
  }, [editName, editHp, instance, onUpdateInstance]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  return (
    <div
      className={`${styles.creatureCard} ${selected ? styles.creatureCardSelected : ''}`}
      onClick={() => onSelect(instance.id, 'instance')}
      draggable
      onDragStart={(e) => {
        const payload = {
          type: 'bestiary-creature' as const,
          id: instance.id,
          name,
          portraitPath: resolved?.avatarPath ?? null,
          meta: { cr, creatureType: resolved?.creatureType, hp: hp ?? resolved?.hpDefault, ac: resolved?.ac },
        };
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.setData('application/bestiary-tree-instance', JSON.stringify({ instanceId: instance.id }));
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
    >
      {editing ? (
        <div className={styles.instanceEditRow} onClick={(e) => e.stopPropagation()}>
          <input
            className={styles.instanceEditInput}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={resolved?.name ?? 'Name'}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          />
          <input
            className={styles.instanceEditInputSm}
            value={editHp}
            onChange={(e) => setEditHp(e.target.value)}
            placeholder="HP"
            type="number"
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
          />
          <button className={styles.instanceEditBtn} onClick={commitEdit} title="Save">
            <span className="material-symbols-outlined">check</span>
          </button>
          <button className={styles.instanceEditBtn} onClick={cancelEdit} title="Cancel">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ) : (
        <>
          {/* Avatar */}
          <div className={styles.creatureAvatar}>
            {resolved?.avatarPath ? (
              <img src={resolved.avatarPath} alt={name} />
            ) : (
              <span className="material-symbols-outlined">{iconName}</span>
            )}
          </div>
          {/* Info */}
          <div className={styles.creatureInfo}>
            <div className={styles.creatureName}>{name}</div>
            <div className={styles.creatureMeta}>
              {[
                resolved?.creatureType,
                hp != null ? `${hp} HP` : null,
                shortId,
              ].filter(Boolean).join(' · ')}
            </div>
          </div>
          {/* CR badge */}
          {cr && (
            <span className={styles.crBadge} style={{ color: getCrColor(cr) }}>
              {cr}
            </span>
          )}
          {/* Actions on hover */}
          <span className={styles.instanceActions}>
            <button className={styles.instanceActionBtn} onClick={(e) => { e.stopPropagation(); startEdit(); }} title="Edit">
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button className={styles.instanceActionBtn} onClick={(e) => { e.stopPropagation(); onDuplicate(instance.id); }} title="Duplicate">
              <span className="material-symbols-outlined">content_copy</span>
            </button>
            <button className={`${styles.instanceActionBtn} ${styles.instanceActionDanger}`} onClick={(e) => { e.stopPropagation(); onDelete(instance.id); }} title="Delete">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </span>
        </>
      )}
    </div>
  );
}

/* ── Encounter Group Card ── */

interface EncounterGroupProps {
  node: TreeNodeData & { kind: 'folder' };
  expanded: boolean;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string, kind: 'folder' | 'instance') => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNodeData) => void;
  onDrop: (targetFolderId: string, data: DataTransfer) => void;
  onDeleteInstance: (id: string) => void;
  onDuplicateInstance: (id: string) => void;
  onUpdateInstance: (instance: CreatureInstance) => void;
  resolveInstance: (instance: CreatureInstance) => CreatureTemplate | null;
  renaming: boolean;
  renameValue: string;
  onRenameValueChange: (val: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
}

export function EncounterGroup({
  node, expanded, selectedId, onToggle, onSelect, onContextMenu, onDrop,
  onDeleteInstance, onDuplicateInstance, onUpdateInstance, resolveInstance,
  renaming, renameValue, onRenameValueChange, onRenameCommit, onRenameCancel,
}: EncounterGroupProps) {
  const [dragOver, setDragOver] = useState(false);
  const folder = node.folder;
  const instanceChildren = node.children.filter((c): c is TreeNodeData & { kind: 'instance' } => c.kind === 'instance');
  const subfolderChildren = node.children.filter((c): c is TreeNodeData & { kind: 'folder' } => c.kind === 'folder');
  const instanceCount = instanceChildren.length;

  return (
    <div className={`${styles.groupCard} ${dragOver ? styles.groupCardDragOver : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(folder.id, e.dataTransfer); }}
    >
      {/* Group header */}
      <div
        className={styles.groupHeader}
        onClick={() => onToggle(folder.id)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/bestiary-tree-folder', JSON.stringify({ folderId: folder.id }));
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <span className={`${styles.groupChevron} ${expanded ? styles.groupChevronOpen : ''}`}>
          <span className="material-symbols-outlined">chevron_right</span>
        </span>
        {renaming ? (
          <input
            className={styles.groupRenameInput}
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel(); }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            onBlur={onRenameCommit}
          />
        ) : (
          <span className={styles.groupName}>{folder.name}</span>
        )}
        <span className={styles.groupCount}>{instanceCount}</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className={styles.groupBody}>
          {instanceChildren.map(child => {
            const resolved = resolveInstance(child.instance);
            return (
              <InstanceRow
                key={child.instance.id}
                instance={child.instance}
                resolved={resolved}
                selected={selectedId === child.instance.id}
                onSelect={onSelect}
                onDelete={onDeleteInstance}
                onDuplicate={onDuplicateInstance}
                onUpdateInstance={onUpdateInstance}
              />
            );
          })}
          {instanceChildren.length === 0 && (
            <div className={styles.groupEmpty}>Drag creatures here</div>
          )}
          {/* Nested subfolders rendered as nested group cards */}
          {subfolderChildren.map(child => (
            <EncounterGroup
              key={child.folder.id}
              node={child}
              expanded={false}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDrop={onDrop}
              onDeleteInstance={onDeleteInstance}
              onDuplicateInstance={onDuplicateInstance}
              onUpdateInstance={onUpdateInstance}
              resolveInstance={resolveInstance}
              renaming={false}
              renameValue=""
              onRenameValueChange={() => {}}
              onRenameCommit={() => {}}
              onRenameCancel={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Context menu rendered via portal */
export function TreeContextMenu({ x, y, items, onClose }: {
  x: number;
  y: number;
  items: { label: string; icon?: string; danger?: boolean; onClick: () => void }[];
  onClose: () => void;
}) {
  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className={styles.contextMenu} style={{ left: x, top: y }}>
        {items.map((item) => (
          <button
            key={item.label}
            className={`${styles.contextMenuItem} ${item.danger ? styles.contextMenuDanger : ''}`}
            onClick={() => { item.onClick(); onClose(); }}
          >
            {item.icon && <span className="material-symbols-outlined">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}

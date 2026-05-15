/*
 * EncounterTreePanel — right panel view showing encounter sets as framed group cards.
 * Folders render as bordered glass cards with creature instances inside.
 * New folders prompt for a name inline before creation.
 */

import { useState, useMemo, useCallback } from 'react';
import type { BestiaryFolder, CreatureInstance, CreatureTemplate, TreeNodeData } from '../types';
import { EncounterGroup, TreeContextMenu } from './TreeNode';
import styles from '../Bestiary.module.css';

interface EncounterTreePanelProps {
  folders: BestiaryFolder[];
  instances: CreatureInstance[];
  templates: CreatureTemplate[];
  selectedId: string | null;
  expandedFolders: string[];
  onToggleExpand: (id: string) => void;
  onSelect: (id: string, kind: 'folder' | 'instance') => void;
  onAddFolder: (parentId: string | null, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteInstance: (id: string) => void;
  onDuplicateInstance: (id: string) => void;
  onDropTemplate: (folderId: string, templateId: string) => void;
  onMoveInstance: (instanceId: string, targetFolderId: string) => void;
  onMoveFolder: (folderId: string, targetParentId: string | null) => void;
  onUpdateInstance: (instance: CreatureInstance) => void;
  resolveInstance: (instance: CreatureInstance) => CreatureTemplate | null;
}

/** Build tree from flat lists */
function buildTree(folders: BestiaryFolder[], instances: CreatureInstance[]): TreeNodeData[] {
  const childMap = new Map<string | null, BestiaryFolder[]>();
  for (const f of folders) {
    const key = f.parentId;
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key)!.push(f);
  }

  const instanceMap = new Map<string, CreatureInstance[]>();
  for (const inst of instances) {
    if (!instanceMap.has(inst.folderId)) instanceMap.set(inst.folderId, []);
    instanceMap.get(inst.folderId)!.push(inst);
  }

  function buildNode(parentId: string | null): TreeNodeData[] {
    const folderNodes: TreeNodeData[] = (childMap.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(folder => ({
        kind: 'folder' as const,
        folder,
        children: [
          ...buildNode(folder.id),
          ...(instanceMap.get(folder.id) ?? [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(instance => ({ kind: 'instance' as const, instance })),
        ],
      }));
    return folderNodes;
  }

  return buildNode(null);
}

export function EncounterTreePanel({
  folders, instances, templates, selectedId, expandedFolders,
  onToggleExpand, onSelect, onAddFolder, onRenameFolder, onDeleteFolder,
  onDeleteInstance, onDuplicateInstance, onDropTemplate, onMoveInstance, onMoveFolder,
  onUpdateInstance, resolveInstance,
}: EncounterTreePanelProps) {
  const tree = useMemo(() => buildTree(folders, instances), [folders, instances]);
  const expandedSet = useMemo(() => new Set(expandedFolders), [expandedFolders]);

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; node: TreeNodeData;
  } | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Inline new-folder creation state
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Creature picker state
  const [pickerFolderId, setPickerFolderId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNodeData) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleDrop = useCallback((targetFolderId: string, data: DataTransfer) => {
    const templateData = data.getData('application/bestiary-template');
    if (templateData) {
      const { templateId } = JSON.parse(templateData) as { templateId: string };
      onDropTemplate(targetFolderId, templateId);
      return;
    }
    const instanceData = data.getData('application/bestiary-tree-instance');
    if (instanceData) {
      const { instanceId } = JSON.parse(instanceData) as { instanceId: string };
      onMoveInstance(instanceId, targetFolderId);
      return;
    }
    const folderData = data.getData('application/bestiary-tree-folder');
    if (folderData) {
      const { folderId } = JSON.parse(folderData) as { folderId: string };
      if (folderId !== targetFolderId) {
        onMoveFolder(folderId, targetFolderId);
      }
    }
  }, [onDropTemplate, onMoveInstance, onMoveFolder]);

  const startRename = useCallback((folderId: string, currentName: string) => {
    setRenamingId(folderId);
    setRenameValue(currentName);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onRenameFolder(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue, onRenameFolder]);

  // Inline folder creation
  const startCreateFolder = useCallback(() => {
    setCreatingFolder(true);
    setNewFolderName('');
  }, []);

  const commitCreateFolder = useCallback(() => {
    const name = newFolderName.trim();
    if (name) {
      onAddFolder(null, name);
    }
    setCreatingFolder(false);
    setNewFolderName('');
  }, [newFolderName, onAddFolder]);

  const cancelCreateFolder = useCallback(() => {
    setCreatingFolder(false);
    setNewFolderName('');
  }, []);

  // Build context menu items
  const menuItems = contextMenu ? (() => {
    const { node } = contextMenu;
    if (node.kind === 'folder') {
      return [
        { label: 'Add Creature', icon: 'add_circle', onClick: () => { setPickerFolderId(node.folder.id); setPickerSearch(''); } },
        { label: 'Rename', icon: 'edit', onClick: () => startRename(node.folder.id, node.folder.name) },
        { label: 'Delete Group', icon: 'delete', danger: true, onClick: () => onDeleteFolder(node.folder.id) },
      ];
    }
    return [
      { label: 'Duplicate', icon: 'content_copy', onClick: () => onDuplicateInstance(node.instance.id) },
      { label: 'Delete', icon: 'delete', danger: true, onClick: () => onDeleteInstance(node.instance.id) },
    ];
  })() : [];

  return (
    <>
      <div className={styles.listToolbar}>
        <button className={styles.iconBtn} onClick={startCreateFolder} title="New encounter group">
          <span className={styles.iconSm}>create_new_folder</span> New Group
        </button>
      </div>

      <div className={styles.groupArea}>
        {/* Inline new folder input */}
        {creatingFolder && (
          <div className={styles.groupCard}>
            <div className={styles.groupHeader}>
              <span className={styles.groupChevron}><span className={styles.iconSm}>chevron_right</span></span>
              <input
                className={styles.groupRenameInput}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitCreateFolder(); if (e.key === 'Escape') cancelCreateFolder(); }}
                onBlur={() => { if (newFolderName.trim()) commitCreateFolder(); else cancelCreateFolder(); }}
                placeholder="Enter group name..."
                autoFocus
              />
            </div>
          </div>
        )}

        {tree.length === 0 && !creatingFolder ? (
          <div className={styles.emptyState}>
            No encounter sets yet. Click + New Group to create one.
          </div>
        ) : (
          tree.map(node => {
            if (node.kind !== 'folder') return null;
            return (
              <EncounterGroup
                key={node.folder.id}
                node={node}
                expanded={expandedSet.has(node.folder.id)}
                selectedId={selectedId}
                onToggle={onToggleExpand}
                onSelect={onSelect}
                onContextMenu={handleContextMenu}
                onDrop={handleDrop}
                onDeleteInstance={onDeleteInstance}
                onDuplicateInstance={onDuplicateInstance}
                onUpdateInstance={onUpdateInstance}
                resolveInstance={resolveInstance}
                renaming={renamingId === node.folder.id}
                renameValue={renameValue}
                onRenameValueChange={setRenameValue}
                onRenameCommit={commitRename}
                onRenameCancel={() => setRenamingId(null)}
              />
            );
          })
        )}
      </div>

      {contextMenu && (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Creature picker overlay */}
      {pickerFolderId && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={() => setPickerFolderId(null)} />
          <div className={styles.pickerOverlay}>
            <div className={styles.pickerHeader}>
              <span>Add creature to group</span>
              <button className={styles.iconBtn} onClick={() => setPickerFolderId(null)}>
                <span className={styles.iconSm}>close</span>
              </button>
            </div>
            <input
              className={styles.formInput}
              placeholder="Search templates..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
            <div className={styles.pickerList}>
              {templates
                .filter(t => t.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map(t => (
                  <button
                    key={t.id}
                    className={styles.pickerItem}
                    onClick={() => { onDropTemplate(pickerFolderId, t.id); setPickerFolderId(null); }}
                  >
                    <span>{t.name}</span>
                    {t.cr && <span className={styles.crBadge}>{t.cr}</span>}
                  </button>
                ))}
              {templates.length === 0 && (
                <div className={styles.emptyState}>No templates in library. Create creatures in the Library tab first.</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/*
 * useBestiaryState — main state hook for creature library and encounter sets.
 * Loads all data from SQLite via IPC on mount, provides CRUD operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CreatureTemplate, BestiaryFolder, CreatureInstance,
  CreatureAction, CreatureTrait, CustomField, AbilityScores, CreatureType,
} from '../types';
import type { BestiaryTemplateRow, BestiaryFolderRow, BestiaryInstanceRow } from '../../../electron.d';

/** Parse a template row from DB into domain type */
function parseTemplateRow(row: BestiaryTemplateRow): CreatureTemplate {
  return {
    id: row.id,
    name: row.name,
    creatureType: (row.creature_type as CreatureType) ?? null,
    cr: row.cr,
    hpFormula: row.hp_formula,
    hpDefault: row.hp_default,
    ac: row.ac,
    speed: row.speed ? JSON.parse(row.speed) as Record<string, number> : {},
    abilityScores: row.ability_scores ? JSON.parse(row.ability_scores) as AbilityScores : null,
    savingThrows: row.saving_throws ? JSON.parse(row.saving_throws) as Partial<AbilityScores> : null,
    actions: row.actions ? JSON.parse(row.actions) as CreatureAction[] : [],
    actionsMode: (row.actions_mode as 'structured' | 'freetext') ?? 'structured',
    actionsText: row.actions_text ?? '',
    traits: row.traits ? JSON.parse(row.traits) as CreatureTrait[] : [],
    customFields: row.custom_fields ? JSON.parse(row.custom_fields) as CustomField[] : [],
    tags: row.tags ? JSON.parse(row.tags) as string[] : [],
    avatarPath: row.avatar_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseFolderRow(row: BestiaryFolderRow): BestiaryFolder {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function parseInstanceRow(row: BestiaryInstanceRow): CreatureInstance {
  return {
    id: row.id,
    folderId: row.folder_id,
    templateId: row.template_id,
    instanceName: row.instance_name,
    overrides: row.overrides ? JSON.parse(row.overrides) as Record<string, unknown> : {},
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function useBestiaryState() {
  const [templates, setTemplates] = useState<CreatureTemplate[]>([]);
  const [folders, setFolders] = useState<BestiaryFolder[]>([]);
  const [instances, setInstances] = useState<CreatureInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  // Load all data on mount
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    async function load() {
      const api = window.electronAPI?.bestiary;
      if (!api) { setLoading(false); return; }

      try {
        const [tRows, fRows, iRows] = await Promise.all([
          api.listTemplates(),
          api.listFolders(),
          api.listInstances(),
        ]);
        setTemplates(tRows.map(parseTemplateRow));
        setFolders(fRows.map(parseFolderRow));
        setInstances(iRows.map(parseInstanceRow));
      } catch (err) {
        console.error('Failed to load bestiary data', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ── Template CRUD ──

  const saveTemplate = useCallback(async (template: CreatureTemplate) => {
    const api = window.electronAPI?.bestiary;
    if (!api) return;

    await api.saveTemplate(JSON.stringify(template));
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === template.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = template;
        return next;
      }
      return [...prev, template];
    });
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const api = window.electronAPI?.bestiary;
    if (!api) return;

    await api.deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    // Orphan instances
    setInstances(prev => prev.map(inst =>
      inst.templateId === id ? { ...inst, templateId: null } : inst
    ));
  }, []);

  // ── Folder CRUD ──

  const saveFolder = useCallback(async (folder: BestiaryFolder) => {
    const api = window.electronAPI?.bestiary;
    if (!api) return;

    await api.saveFolder(folder.id, folder.parentId, folder.name, folder.sortOrder);
    setFolders(prev => {
      const idx = prev.findIndex(f => f.id === folder.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = folder;
        return next;
      }
      return [...prev, folder];
    });
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    const api = window.electronAPI?.bestiary;
    if (!api) return;

    // Collect all descendant folder IDs for cascade
    const toDelete = new Set<string>();
    function collectDescendants(parentId: string) {
      toDelete.add(parentId);
      for (const f of folders) {
        if (f.parentId === parentId) collectDescendants(f.id);
      }
    }
    collectDescendants(id);

    await api.deleteFolder(id);
    setFolders(prev => prev.filter(f => !toDelete.has(f.id)));
    setInstances(prev => prev.filter(inst => !toDelete.has(inst.folderId)));
  }, [folders]);

  // ── Instance CRUD ──

  const saveInstance = useCallback(async (instance: CreatureInstance) => {
    const api = window.electronAPI?.bestiary;
    if (!api) return;

    await api.saveInstance(
      instance.id, instance.folderId, instance.templateId,
      instance.instanceName, JSON.stringify(instance.overrides), instance.sortOrder,
    );
    setInstances(prev => {
      const idx = prev.findIndex(i => i.id === instance.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = instance;
        return next;
      }
      return [...prev, instance];
    });
  }, []);

  const deleteInstance = useCallback(async (id: string) => {
    const api = window.electronAPI?.bestiary;
    if (!api) return;

    await api.deleteInstance(id);
    setInstances(prev => prev.filter(i => i.id !== id));
  }, []);

  // ── Resolve instance (merge template + overrides) ──

  const resolveInstance = useCallback((instance: CreatureInstance): CreatureTemplate | null => {
    const template = templates.find(t => t.id === instance.templateId);
    if (!template) {
      // Orphaned — try to reconstruct from overrides
      const o = instance.overrides as Record<string, unknown>;
      if (o.name) {
        return {
          id: instance.id,
          name: (instance.instanceName ?? o.name ?? 'Unknown') as string,
          creatureType: (o.creatureType as CreatureType) ?? null,
          cr: (o.cr as string) ?? null,
          hpFormula: (o.hpFormula as string) ?? null,
          hpDefault: (o.hpDefault as number) ?? null,
          ac: (o.ac as number) ?? null,
          speed: (o.speed as Record<string, number>) ?? {},
          abilityScores: (o.abilityScores as AbilityScores) ?? null,
          savingThrows: (o.savingThrows as Partial<AbilityScores>) ?? null,
          actions: (o.actions as CreatureAction[]) ?? [],
          actionsMode: (o.actionsMode as 'structured' | 'freetext') ?? 'structured',
          actionsText: (o.actionsText as string) ?? '',
          traits: (o.traits as CreatureTrait[]) ?? [],
          customFields: (o.customFields as CustomField[]) ?? [],
          tags: (o.tags as string[]) ?? [],
          avatarPath: (o.avatarPath as string) ?? null,
          createdAt: instance.createdAt,
          updatedAt: instance.createdAt,
        };
      }
      return null;
    }

    // Merge: template as base, overrides on top
    const overrides = instance.overrides;
    return {
      ...template,
      ...overrides,
      id: template.id,
      name: instance.instanceName ?? (overrides.name as string) ?? template.name,
    } as CreatureTemplate;
  }, [templates]);

  return {
    templates,
    folders,
    instances,
    loading,
    saveTemplate,
    deleteTemplate,
    saveFolder,
    deleteFolder,
    saveInstance,
    deleteInstance,
    resolveInstance,
  };
}

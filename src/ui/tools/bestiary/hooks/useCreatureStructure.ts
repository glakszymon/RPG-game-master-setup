/*
 * useCreatureStructure — loads and saves CreatureStructure per campaign.
 * Uses campaign_settings IPC with key 'creature_structure'.
 * Falls back to D&D 2024 default preset.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_CREATURE_STRUCTURE, SETTINGS_KEY_CREATURE_STRUCTURE } from '../defaultCreatureStructure';
import type { FieldStructure } from '../../../components/dynamic-fields';

interface UseCreatureStructureResult {
  structure: FieldStructure;
  setStructure: (structure: FieldStructure) => void;
  loading: boolean;
}

export function useCreatureStructure(campaignId: string | null): UseCreatureStructureResult {
  const [structure, setStructureState] = useState<FieldStructure>(DEFAULT_CREATURE_STRUCTURE);
  const [loading, setLoading] = useState(!!campaignId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    let cancelled = false;

    async function load() {
      const raw = await window.electronAPI?.settings.load(campaignId!, SETTINGS_KEY_CREATURE_STRUCTURE);
      if (cancelled) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as FieldStructure;
          // Migration: if saved structure lacks column assignments, reset to default
          const hasColumns = parsed.sections?.some(s => s.column != null);
          if (!hasColumns) {
            setStructureState(DEFAULT_CREATURE_STRUCTURE);
            window.electronAPI?.settings.save(campaignId!, SETTINGS_KEY_CREATURE_STRUCTURE, JSON.stringify(DEFAULT_CREATURE_STRUCTURE));
          } else {
            setStructureState(parsed);
          }
        } catch {
          setStructureState(DEFAULT_CREATURE_STRUCTURE);
        }
      } else {
        setStructureState(DEFAULT_CREATURE_STRUCTURE);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  const setStructure = useCallback((next: FieldStructure) => {
    setStructureState(next);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (campaignId) {
        window.electronAPI?.settings.save(campaignId, SETTINGS_KEY_CREATURE_STRUCTURE, JSON.stringify(next));
      }
    }, 500);
  }, [campaignId]);

  return { structure, setStructure, loading };
}

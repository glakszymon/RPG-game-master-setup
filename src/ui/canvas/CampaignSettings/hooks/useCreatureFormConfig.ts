/*
 * useCreatureFormConfig — loads and saves creature form config per campaign.
 * Uses the campaign_settings IPC with key 'creature_form_config'.
 */

import { useState, useEffect, useRef } from 'react';
import { DEFAULT_CREATURE_FORM_CONFIG, SETTINGS_KEY_CREATURE_FORM } from '../creatureFormConfig';
import type { CreatureFormConfig } from '../creatureFormConfig';

interface UseCreatureFormConfigResult {
  config: CreatureFormConfig;
  setConfig: (config: CreatureFormConfig) => void;
  loading: boolean;
}

export function useCreatureFormConfig(campaignId: string | null): UseCreatureFormConfigResult {
  const [config, setConfigState] = useState<CreatureFormConfig>(DEFAULT_CREATURE_FORM_CONFIG);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const raw = await window.electronAPI?.settings.load(campaignId!, SETTINGS_KEY_CREATURE_FORM);
      if (cancelled) return;
      if (raw) {
        try {
          setConfigState(JSON.parse(raw) as CreatureFormConfig);
        } catch {
          setConfigState(DEFAULT_CREATURE_FORM_CONFIG);
        }
      } else {
        setConfigState(DEFAULT_CREATURE_FORM_CONFIG);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  const setConfig = (next: CreatureFormConfig) => {
    setConfigState(next);

    // Debounced save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (campaignId) {
        window.electronAPI?.settings.save(campaignId, SETTINGS_KEY_CREATURE_FORM, JSON.stringify(next));
      }
    }, 500);
  };

  return { config, setConfig, loading };
}

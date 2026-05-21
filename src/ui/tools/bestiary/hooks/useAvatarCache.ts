/*
 * useAvatarCache — global in-memory cache for lazy-loaded bestiary avatars.
 * Prevents loading all 293+ base64 avatars upfront; loads on-demand per template.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/** Module-level cache shared across all hook instances */
const avatarCache = new Map<string, string | null>();
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Returns the cached avatar data URL for a given templateId.
 * Triggers async load if not yet cached. Returns null while loading.
 */
export function useAvatarCache(templateId: string | null | undefined): string | null {
  const [avatar, setAvatar] = useState<string | null>(
    templateId ? (avatarCache.get(templateId) ?? null) : null,
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!templateId) { setAvatar(null); return; } // eslint-disable-line react-hooks/set-state-in-effect

    // Already cached
    if (avatarCache.has(templateId)) {
      setAvatar(avatarCache.get(templateId) ?? null);
      return;
    }

    // Load from IPC
    let request = pendingRequests.get(templateId);
    if (!request) {
      request = window.electronAPI?.bestiary.getAvatar(templateId) ?? Promise.resolve(null);
      pendingRequests.set(templateId, request);
      request.then((data) => {
        avatarCache.set(templateId, data);
        pendingRequests.delete(templateId);
      });
    }

    request.then((data) => {
      if (mountedRef.current) setAvatar(data);
    });
  }, [templateId]);

  return avatar;
}

/**
 * Imperatively load avatar for a template (used during drag-drop).
 * Returns cached value immediately if available, otherwise fetches.
 */
export async function loadAvatar(templateId: string): Promise<string | null> {
  if (avatarCache.has(templateId)) return avatarCache.get(templateId) ?? null;

  let request = pendingRequests.get(templateId);
  if (!request) {
    request = window.electronAPI?.bestiary.getAvatar(templateId) ?? Promise.resolve(null);
    pendingRequests.set(templateId, request);
    request.then((data) => {
      avatarCache.set(templateId, data);
      pendingRequests.delete(templateId);
    });
  }
  return request;
}

/** Pre-warm cache for a batch of template IDs (e.g. visible cards) */
export function useAvatarBatch(templateIds: string[]): Map<string, string | null> {
  const [results, setResults] = useState<Map<string, string | null>>(new Map());
  const mountedRef = useRef(true);
  const idsKey = templateIds.join(',');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadBatch = useCallback(async () => {
    const toLoad = templateIds.filter(id => !avatarCache.has(id));
    if (toLoad.length > 0) {
      await Promise.all(toLoad.map(id => loadAvatar(id)));
    }
    if (mountedRef.current) {
      const map = new Map<string, string | null>();
      for (const id of templateIds) {
        map.set(id, avatarCache.get(id) ?? null);
      }
      setResults(map);
    }
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBatch(); }, [loadBatch]);

  return results;
}

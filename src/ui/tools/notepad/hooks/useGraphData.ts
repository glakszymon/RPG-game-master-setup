/*
 * useGraphData — Fetches note links and builds graph node/edge structure.
 */

import { useCallback, useState } from 'react';
import type { NoteItem } from '../types';

export interface GraphNode {
  id: string;
  title: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useGraphData(campaignId: string, notes: NoteItem[]) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });

  const refresh = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    try {
      const links = await api.noteLinks.list(campaignId);

      const nodes: GraphNode[] = notes.map(n => ({
        id: n.id,
        title: n.title,
      }));

      const noteIds = new Set(notes.map(n => n.id));
      const edges: GraphEdge[] = links
        .filter(l => noteIds.has(l.source_note_id) && noteIds.has(l.target_note_id))
        .map(l => ({
          source: l.source_note_id,
          target: l.target_note_id,
        }));

      setGraphData({ nodes, edges });
    } catch {
      // silent
    }
  }, [campaignId, notes]);

  return { graphData, refresh };
}

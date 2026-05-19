/*
 * StoryGraph — Mermaid-style flowchart visualization of note relationships.
 *
 * Rectangular nodes with rounded corners, text inside, connected by arrowed edges.
 * Nodes are manually positioned by dragging. Positions persist to SQLite.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { GraphData, GraphNode } from '../hooks/useGraphData';
import styles from './StoryGraph.module.css';

interface StoryGraphProps {
  data: GraphData;
  activeNoteId: string | null;
  campaignId: string;
  onSelectNote: (noteId: string) => void;
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 36;
const NODE_RX = 6;

export function StoryGraph({ data, activeNoteId, campaignId, onSelectNote }: StoryGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [dimensions, setDimensions] = useState({ w: 400, h: 300 });
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; nodeStartX: number; nodeStartY: number; moved: boolean } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const positionsLoadedRef = useRef(false);

  // Track dimensions
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({ w: entry.contentRect.width || 400, h: entry.contentRect.height || 300 });
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Load positions from DB and lay out nodes
  const loadPositions = useCallback(async () => {
    if (data.nodes.length === 0) {
      setNodes([]);
      return;
    }

    const api = window.electronAPI;
    const cols = Math.ceil(Math.sqrt(data.nodes.length));
    const spacingX = NODE_WIDTH + 40;
    const spacingY = NODE_HEIGHT + 60;

    if (!api) {
      setNodes(data.nodes.map((n, i) => ({
        ...n,
        x: (i % cols) * spacingX - (cols * spacingX) / 2,
        y: Math.floor(i / cols) * spacingY - 100,
      })));
      return;
    }

    const positions = await api.noteGraph.listPositions(campaignId);
    const posMap = new Map(positions.map(p => [p.note_id, { x: p.x, y: p.y }]));

    const positioned: PositionedNode[] = data.nodes.map((n, i) => {
      const saved = posMap.get(n.id);
      if (saved) {
        return { ...n, x: saved.x, y: saved.y };
      }
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { ...n, x: col * spacingX - (cols * spacingX) / 2, y: row * spacingY - 100 };
    });

    setNodes(positioned);
    positionsLoadedRef.current = true;
  }, [data.nodes, campaignId]);

  useEffect(() => {
    loadPositions(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadPositions]);

  // Save position to DB
  const savePosition = useCallback((noteId: string, x: number, y: number) => {
    window.electronAPI?.noteGraph.savePosition(noteId, campaignId, x, y);
  }, [campaignId]);

  // ── Mouse handlers ──

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = (e.target as Element).closest('[data-node-id]');
    if (target) {
      const nodeId = target.getAttribute('data-node-id')!;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        dragRef.current = { nodeId, startX: e.clientX, startY: e.clientY, nodeStartX: node.x, nodeStartY: node.y, moved: false };
      }
      return;
    }
    panRef.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y };
  }, [nodes, transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / transform.k;
      const dy = (e.clientY - dragRef.current.startY) / transform.k;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragRef.current.moved = true;
      }
      const newX = dragRef.current.nodeStartX + dx;
      const newY = dragRef.current.nodeStartY + dy;
      const dragNodeId = dragRef.current.nodeId;
      setNodes(prev => prev.map(n =>
        n.id === dragNodeId ? { ...n, x: newX, y: newY } : n
      ));
      return;
    }
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setTransform({ ...transform, x: panRef.current.tx + dx, y: panRef.current.ty + dy });
    }
  }, [transform]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      if (dragRef.current.moved) {
        const node = nodes.find(n => n.id === dragRef.current!.nodeId);
        if (node) {
          savePosition(node.id, node.x, node.y);
        }
      }
      dragRef.current = null;
      return;
    }
    panRef.current = null;
  }, [nodes, savePosition]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({ ...t, k: Math.max(0.3, Math.min(3, t.k * delta)) }));
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, noteId: string) => {
    if (dragRef.current?.moved) return;
    e.stopPropagation();
    onSelectNote(noteId);
  }, [onSelectNote]);

  if (data.nodes.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No notes yet</p>
      </div>
    );
  }

  // Build edge map from node positions
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const cx = dimensions.w / 2;
  const cy = dimensions.h / 2;

  return (
    <svg
      ref={svgRef}
      className={styles.graph}
      viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" className={styles.arrowhead} />
        </marker>
      </defs>

      <g transform={`translate(${cx + transform.x}, ${cy + transform.y}) scale(${transform.k})`}>
        {/* Edges with arrows */}
        {data.edges.map((edge, i) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;

          // Self-loop
          if (edge.source === edge.target) {
            const loopR = 20;
            const sx = source.x;
            const sy = source.y - NODE_HEIGHT / 2;
            return (
              <path
                key={i}
                d={`M ${sx - 8} ${sy} C ${sx - 8} ${sy - loopR * 2} ${sx + 8} ${sy - loopR * 2} ${sx + 8} ${sy}`}
                fill="none"
                className={styles.edge}
                markerEnd="url(#arrowhead)"
              />
            );
          }

          // Detect bidirectional edge (reverse exists)
          const isBidirectional = data.edges.some(
            e => e.source === edge.target && e.target === edge.source
          );

          // Calculate edge connection points (from border of rectangles)
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const angle = Math.atan2(dy, dx);

          // Source point: exit from rectangle border
          const sx = source.x + Math.cos(angle) * (NODE_WIDTH / 2);
          const sy = source.y + Math.sin(angle) * (NODE_HEIGHT / 2);

          // Target point: enter rectangle border (offset for arrowhead)
          const tx = target.x - Math.cos(angle) * (NODE_WIDTH / 2 + 6);
          const ty = target.y - Math.sin(angle) * (NODE_HEIGHT / 2 + 6);

          if (isBidirectional) {
            // Curved arc to separate from the reverse edge
            const curvature = Math.min(40, dist * 0.2);
            const nx = -Math.sin(angle) * curvature;
            const ny = Math.cos(angle) * curvature;
            const mx = (sx + tx) / 2 + nx;
            const my = (sy + ty) / 2 + ny;

            return (
              <path
                key={i}
                d={`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`}
                fill="none"
                className={styles.edge}
                markerEnd="url(#arrowhead)"
              />
            );
          }

          // Straight line for unidirectional edges
          return (
            <path
              key={i}
              d={`M ${sx} ${sy} L ${tx} ${ty}`}
              fill="none"
              className={styles.edge}
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* Nodes — Mermaid-style rounded rectangles */}
        {nodes.map(node => {
          const isActive = node.id === activeNoteId;
          return (
            <g
              key={node.id}
              data-node-id={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={(e) => handleNodeClick(e, node.id)}
              style={{ cursor: 'grab' }}
            >
              <rect
                x={-NODE_WIDTH / 2}
                y={-NODE_HEIGHT / 2}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={NODE_RX}
                ry={NODE_RX}
                className={isActive ? styles.nodeRectActive : styles.nodeRect}
              />
              <text
                textAnchor="middle"
                dy="0.35em"
                className={isActive ? styles.nodeLabelActive : styles.nodeLabel}
              >
                {node.title.length > 16 ? node.title.slice(0, 14) + '…' : node.title}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

---
title: "feat: Combat Tracker ↔ Map Integration"
type: feat
status: active
date: 2026-05-18
origin: docs/brainstorms/2026-05-18-combat-tracker-requirements.md
---

# feat: Combat Tracker ↔ Map Integration

## Overview

Integrate the Combat Tracker with the Map Display so combat state is visually reflected on the map in real-time: active turn highlighting, HP change animations, condition icons on tokens, and the ability to place combatants on the map.

## Problem Statement

Currently, the combat tracker and map are fully isolated tools — they share `sourceType`/`sourceId` fields but have no runtime link. The GM must mentally track which token belongs to which combatant. This feature creates a live visual bridge between them.

## Proposed Solution

Introduce a **module-level singleton event bus** (~60 LOC) that allows tools to broadcast typed events without coupling. The combat tracker publishes events; the map subscribes and renders visual responses.

## Technical Approach

### Architecture: Module-Level Singleton Event Bus

**Why singleton over Context:** Aligns with the project's "no React Context for shared state" pattern (see AGENTS.md). Zero provider wrappers, synchronous dispatch for 60fps, StrictMode-safe via hook cleanup.

```
src/ui/event-bus/
  types.ts          # EventMap interface (typed events)
  event-bus.ts      # subscribe(), publish()
  useEventBus.ts    # useSubscribe(), usePublish() hooks
  index.ts          # barrel export
```

#### `src/ui/event-bus/types.ts`

```typescript
export interface EventMap {
  'combat:turn-changed': { sourceType: string; sourceId: string | null; combatantId: string };
  'combat:hp-changed': { sourceType: string; sourceId: string | null; delta: number };
  'combat:conditions-changed': { sourceType: string; sourceId: string | null; conditions: ActiveCondition[] };
  'combat:combatant-added': { combatant: Combatant };
  'combat:reset': {};
}

export type EventKey = keyof EventMap;
export type EventHandler<K extends EventKey> = (payload: EventMap[K]) => void;
```

#### `src/ui/event-bus/event-bus.ts`

```typescript
import type { EventKey, EventHandler } from './types';

type Listeners = { [K in EventKey]?: Set<EventHandler<K>> };
const listeners: Listeners = {};

export function subscribe<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
  if (!listeners[event]) listeners[event] = new Set();
  const set = listeners[event] as Set<EventHandler<K>>;
  set.add(handler);
  return () => { set.delete(handler); if (set.size === 0) delete listeners[event]; };
}

export function publish<K extends EventKey>(event: K, payload: EventMap[K]): void {
  const set = listeners[event] as Set<EventHandler<K>> | undefined;
  if (!set) return;
  for (const handler of set) handler(payload);
}
```

#### `src/ui/event-bus/useEventBus.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { subscribe, publish } from './event-bus';
import type { EventKey, EventHandler, EventMap } from './types';

export function useSubscribe<K extends EventKey>(event: K, handler: EventHandler<K>): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler; // always fresh, no re-subscribe

  useEffect(() => {
    const stable: EventHandler<K> = (payload) => handlerRef.current(payload);
    return subscribe(event, stable); // cleanup unsubscribes — StrictMode-safe
  }, [event]);
}

export function usePublish<K extends EventKey>(event: K) {
  return useCallback((payload: EventMap[K]) => publish(event, payload), [event]);
}
```

### Implementation Phases

#### Phase 1: Event Bus Foundation (~60 LOC)

**Files to create:**
- `src/ui/event-bus/types.ts`
- `src/ui/event-bus/event-bus.ts`
- `src/ui/event-bus/useEventBus.ts`
- `src/ui/event-bus/index.ts`

**Tasks:**
- [ ] Create typed event bus module
- [ ] Create `useSubscribe` / `usePublish` hooks with StrictMode-safe cleanup
- [ ] No changes to InfiniteCanvas needed (no provider)

---

#### Phase 2: Active Turn Highlighting on Map

**Files to modify:**
- `src/ui/tools/combat-tracker/CombatTracker.tsx` — publish `combat:turn-changed` on next turn and reset
- `src/ui/tools/map-display/hooks/useTokenRenderer.ts` — subscribe, store `activeSourceId`, draw glow

**Publish (Combat Tracker):**
```typescript
// In handleNextTurn:
const active = state.combatants[nextIndex];
publish('combat:turn-changed', {
  sourceType: active.sourceType,
  sourceId: active.sourceId,
  combatantId: active.id,
});

// On reset:
publish('combat:reset', {});
```

**Subscribe (Map — useTokenRenderer):**
```typescript
const activeSourceRef = useRef<{ sourceType: string; sourceId: string | null } | null>(null);

useSubscribe('combat:turn-changed', ({ sourceType, sourceId }) => {
  activeSourceRef.current = { sourceType, sourceId };
});

useSubscribe('combat:reset', () => {
  activeSourceRef.current = null;
});
```

**Rendering — pulsing golden glow:**
```typescript
// Draw BEFORE token (so glow appears behind)
function renderActiveTokenGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, now: number, zoom: number) {
  const t = (Math.sin((now / 1500) * Math.PI * 2) + 1) / 2;
  const alpha = 0.3 + t * 0.6;
  const blur = 8 + t * 12;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = blur / zoom;
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3 / zoom;
  ctx.beginPath();
  ctx.arc(x, y, radius + 4 / zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.stroke(); // double-stroke for richer glow
  ctx.restore();
}
```

**Parameters:** 1500ms period, gold (#facc15), alpha 0.3–0.9, shadowBlur 8–20px.

---

#### Phase 3: HP Change Animations (Floating Text)

**Files to modify:**
- `src/ui/tools/combat-tracker/hooks/useCombatState.ts` — publish `combat:hp-changed` in damage/heal
- `src/ui/tools/map-display/hooks/useTokenRenderer.ts` — floating text renderer

**Publish (Combat Tracker):**
```typescript
// In damage():
publish('combat:hp-changed', { sourceType: c.sourceType, sourceId: c.sourceId, delta: -amount });
// In heal():
publish('combat:hp-changed', { sourceType: c.sourceType, sourceId: c.sourceId, delta: +amount });
```

**Subscribe + Render (Map):**
```typescript
interface FloatingText {
  x: number; y: number;
  text: string;
  color: string;
  startTime: number;
}

const FLOAT_DURATION = 1200; // ms
const FLOAT_DISTANCE = 48;  // px rise

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// On event: find token position, spawn floating text
useSubscribe('combat:hp-changed', ({ sourceType, sourceId, delta }) => {
  const token = tokens.find(t => t.sourceType === sourceType && t.sourceId === sourceId);
  if (!token) return; // token not on map — skip silently
  floatingTextsRef.current.push({
    x: token.x + (Math.random() - 0.5) * 20, // jitter to avoid overlap
    y: token.y,
    text: delta > 0 ? `+${delta}` : `${delta}`,
    color: delta > 0 ? '#4ade80' : '#ef4444',
    startTime: performance.now(),
  });
});

// Render each frame (after tokens):
function renderFloatingTexts(ctx, texts, now, zoom) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const ft = texts[i];
    const t = Math.min((now - ft.startTime) / FLOAT_DURATION, 1);
    if (t >= 1) { texts.splice(i, 1); continue; }

    const yOffset = -easeOutCubic(t) * FLOAT_DISTANCE;
    const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${16 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3 / zoom;
    ctx.strokeText(ft.text, ft.x, ft.y + yOffset);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y + yOffset);
    ctx.restore();
  }
}
```

**Parameters:** 1200ms duration, 48px rise, ease-out cubic, fade after 60%, max 50 concurrent.

---

#### Phase 4: Condition Icons on Tokens

**Files to modify:**
- `src/ui/tools/map-display/hooks/useTokenRenderer.ts` — subscribe + render condition dots

**Subscribe:**
```typescript
// tokenOverlays: Map<sourceKey, ConditionIndicator[]>
const overlaysRef = useRef(new Map<string, ConditionIndicator[]>());

useSubscribe('combat:conditions-changed', ({ sourceType, sourceId, conditions }) => {
  const key = `${sourceType}:${sourceId}`;
  if (conditions.length === 0) overlaysRef.current.delete(key);
  else overlaysRef.current.set(key, conditions.map(c => ({
    color: CONDITION_COLORS[c.conditionId] ?? '#94a3b8',
    label: c.conditionId.charAt(0).toUpperCase(),
  })));
});
```

**Render (after token, before floating text):**
```typescript
const CONDITION_COLORS: Record<string, string> = {
  stunned: '#eab308',   // yellow
  poisoned: '#22c55e',  // green
  blinded: '#6b7280',   // gray
  frightened: '#a855f7', // purple
  prone: '#f97316',     // orange
  paralyzed: '#eab308', // yellow
  charmed: '#ec4899',   // pink
  restrained: '#78716c', // stone
  invisible: '#38bdf8', // sky
  incapacitated: '#dc2626', // red
};

function renderConditionDots(ctx, x, y, tokenRadius, conditions, zoom) {
  const dotR = 4 / zoom;
  const orbitRadius = tokenRadius + dotR + 2 / zoom;
  const spacing = Math.PI / 6; // 30°
  const totalArc = spacing * (conditions.length - 1);
  const startAngle = -Math.PI / 2 - totalArc / 2;

  for (let i = 0; i < Math.min(conditions.length, 6); i++) {
    const angle = startAngle + i * spacing;
    const dx = x + Math.cos(angle) * orbitRadius;
    const dy = y + Math.sin(angle) * orbitRadius;

    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = conditions[i].color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();
  }
}
```

**Layout:** Arc from top, 30° spacing, max 6 dots (overflow ignored — rarely more than 5 conditions active).

---

#### Phase 5: Place Combatants on Map (Drag & Drop + Button)

**Files to modify:**
- `src/ui/tools/combat-tracker/components/CombatantCard.tsx` — update drag payload
- `src/ui/tools/map-display/MapDisplay.tsx` — accept `combat-combatant` drop type
- `src/ui/tools/combat-tracker/CombatTracker.tsx` — "Place All" button

**A) Individual drag (already works, enhance payload):**
```typescript
// CombatantCard onDragStart — already emits 'combat-combatant'
// Update payload to include sourceType + sourceId for token creation:
e.dataTransfer.setData('application/json', JSON.stringify({
  type: 'combat-combatant',
  id: combatant.id,
  name: combatant.name,
  portraitPath: combatant.portraitPath,
  sourceType: combatant.sourceType,
  sourceId: combatant.sourceId,
}));
```

**B) Map accepts the drop:**
```typescript
// In MapDisplay handleDrop, add case:
if (data.type === 'combat-combatant') {
  addToken({
    sourceType: data.sourceType ?? 'manual',
    sourceId: data.sourceId ?? data.id,
    name: data.name ?? 'Unknown',
    avatarPath: data.portraitPath ?? null,
    x: worldX, y: worldY,
    scale: 1,
  });
}
```

**C) "Place All" button (via event bus):**
```typescript
// Combat tracker toolbar button "⊞" — publishes each unplaced combatant
publish('combat:combatant-added', { combatant });
// Map subscribes and places at viewport center with offset grid
```

---

#### Phase 6: Integration & Draw Order

**Draw order in the render loop:**
1. Grid
2. **Active token glow** (behind token)
3. Tokens
4. **Condition dots** (on token edge)
5. Fog of War
6. VFX
7. **Floating text** (always on top)

**Performance budget:**
- Floating texts: 50 simultaneous (100 draw calls) — well within budget
- Glow: 1 active token — negligible with shadowBlur
- Condition dots: static fills — negligible
- Enable `renderer.setAnimating(true)` when any active glow or floating text exists

---

## Token ↔ Combatant Matching Strategy

The link uses the shared `sourceType` + `sourceId` pair:
- Party character "Gandalf" → `sourceType: 'party', sourceId: 'char-uuid-123'`
- Same in combat tracker → same pair
- Same on map → same pair

For `manual` combatants (no external source), use the combatant's own `id` as `sourceId`.

## System-Wide Impact

- **Event bus is additive** — no existing tool behavior changes
- **Render performance** — all effects use existing rAF loop, no new DOM elements
- **State isolation preserved** — overlays are transient (in refs, not persisted in toolState)
- **Future extensibility** — other tools can subscribe/publish (e.g., bestiary → map, initiative → party)

## Acceptance Criteria

- [ ] Event bus module created with typed events and hook API
- [ ] When combat tracker advances turn, the corresponding map token pulses with golden glow
- [ ] Damage shows red "-X" floating text rising above the token (1.2s, ease-out)
- [ ] Heal shows green "+X" floating text rising above the token
- [ ] Active conditions appear as color-coded dots around map tokens
- [ ] Combatant cards can be dragged directly onto the map to create tokens
- [ ] "Place All" button places unplaced combatants at viewport center
- [ ] Conditions auto-update on map when changed in combat tracker
- [ ] Highlight and overlays clear when combat is reset
- [ ] No errors when token is not on map (animations silently skipped)

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Multiple map windows open | Events broadcast to all subscribers — each map checks its own tokens |
| Token not on map | Guard clause: skip if no matching token found |
| Many floating texts | Cap at 50, splice oldest first |
| shadowBlur perf on low-end | Fallback: radial gradient approach (no shadowBlur) |
| StrictMode double-mount | Hook cleanup returns unsubscribe — safe |

## Alternative Approaches Considered

1. **React Context provider** — Rejected: adds wrapper, breaks "no Context for shared state" pattern
2. **Direct prop drilling** — Rejected: couples tools tightly
3. **DOM CustomEvent** — Rejected: no TypeScript safety, serialization overhead
4. **Module-level singleton (chosen)** — Zero React overhead, typed, ~60 LOC, StrictMode-safe

## Sources & References

- Token type: `src/ui/tools/map-display/types.ts:MapToken`
- Token renderer: `src/ui/tools/map-display/hooks/useTokenRenderer.ts`
- VFX system: `src/ui/tools/map-display/hooks/useVfxRenderer.ts` (animation pattern reference)
- Combat types: `src/ui/tools/combat-tracker/types.ts`
- Canvas architecture: `src/ui/canvas/InfiniteCanvas.tsx`
- Map drop handler: `src/ui/tools/map-display/MapDisplay.tsx`

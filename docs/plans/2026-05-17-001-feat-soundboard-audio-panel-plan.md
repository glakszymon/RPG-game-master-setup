---
title: "feat: Soundboard Audio Panel"
type: feat
status: active
date: 2026-05-17
origin: docs/brainstorms/2026-05-17-soundboard-requirements.md
---

# feat: Soundboard Audio Panel

## Overview

Implement the Soundboard tool — an ambient audio mixer and SFX panel for tabletop RPG sessions. Supports layering multiple audio tracks simultaneously, scene presets with crossfade transitions, stacking with jitter for SFX, and real-time waveform visualization. Two UI modes: simple (ambient) and full mixer.

The `'soundboard'` tool type is already registered in the canvas system (types.ts, InfiniteCanvas.tsx placeholder). This plan covers building the actual implementation.

## Problem Statement

DMs need immersive audio atmosphere during sessions. No audio support currently exists beyond a synthetic chime in the session timer (`useChimePlayer.ts` uses OscillatorNode). The soundboard fills this gap with ambient layering, one-shot SFX, and scene management.

## Proposed Solution

Web Audio API-based audio engine with:
- AudioContext → GainNodes (per-track + master) → AnalyserNode → destination
- Stacking via multiple AudioBufferSourceNodes per track
- Jitter via detune + scheduling offset
- Crossfade via gain ramping (linearRampToValueAtTime)
- Waveform via AnalyserNode.getByteTimeDomainData on master output
- Two layout components sharing the same hook/state layer

## Technical Approach

### Architecture

```
src/ui/tools/soundboard/
├── types.ts                    # SoundboardState, Track, Preset, SoundboardMode
├── SoundboardSimple.tsx        # Simple mode layout
├── SoundboardMixer.tsx         # Mixer mode layout  
├── Soundboard.tsx              # Root: mode switch + shared state
├── Soundboard.module.css
├── components/
│   ├── TrackRow.tsx            # Per-track controls (play/pause, vol, loop, name, tags)
│   ├── TrackRowMixer.tsx       # Extended: + fire button, jitter slider, stacking indicator
│   ├── MasterControls.tsx      # Master volume + waveform canvas
│   ├── PresetPanel.tsx         # Preset list, save, load, delete
│   └── LibraryBrowser.tsx      # CC0 sample grid with category filter
├── hooks/
│   ├── useAudioEngine.ts       # Web Audio API core: context, nodes, playback
│   ├── useWaveform.ts          # AnalyserNode → canvas rendering (rAF loop)
│   ├── useCrossfade.ts         # Gain ramping between presets
│   └── useStacking.ts         # Multi-instance playback + jitter
└── index.ts
```

### IPC Additions

New IPC domain `soundboard:` for file operations:

| Channel | Purpose |
|---------|---------|
| `soundboard:import-audio` | Open file dialog (MP3/WAV/OGG), copy to campaign folder, return path |
| `soundboard:read-audio` | Read audio file → ArrayBuffer for Web Audio decoding |
| `soundboard:list-bundled` | List bundled CC0 samples with metadata |
| `soundboard:read-bundled` | Read bundled sample → ArrayBuffer |

Audio files stored at: `<campaign-folder>/audio/<filename>`

### State Shape

```typescript
interface SoundboardState {
  mode: 'simple' | 'mixer';
  tracks: Track[];
  presets: Preset[];
  activePresetId: string | null;
  masterVolume: number; // 0-1
}

interface Track {
  id: string;
  name: string;
  tags: string[];
  source: 'imported' | 'bundled';
  filePath: string; // relative path or bundled key
  volume: number; // 0-1
  loop: boolean;
  isPlaying: boolean;
  // Mixer-only
  stackingEnabled: boolean;
  maxInstances: number; // 6-8
  jitterIntensity: number; // 0-1
}

interface Preset {
  id: string;
  name: string;
  trackConfigs: PresetTrackConfig[];
}

interface PresetTrackConfig {
  trackId: string;
  volume: number;
  isPlaying: boolean;
  loop: boolean;
}
```

### Implementation Phases

#### Phase 1: Audio Engine Foundation

- Create `useAudioEngine` hook: AudioContext, GainNode graph, play/pause/stop
- Implement `soundboard:import-audio` and `soundboard:read-audio` IPC channels
- Basic `Soundboard.tsx` + `TrackRow.tsx` with play/pause, volume, loop
- Master volume control
- Wire up tool state persistence (patchState pattern)

**Success criteria:** Can import MP3/WAV/OGG, play multiple tracks simultaneously with individual volume

#### Phase 2: Waveform + Library

- Implement `useWaveform` hook with AnalyserNode → canvas (rAF)
- `MasterControls.tsx` with waveform canvas display
- Bundle 8 CC0 samples in app assets
- `LibraryBrowser.tsx` grid with category filter
- `soundboard:list-bundled` and `soundboard:read-bundled` IPC

**Success criteria:** Real-time waveform for master output, CC0 library browsable and playable

#### Phase 3: Stacking + Jitter

- `useStacking` hook: multiple AudioBufferSourceNodes, instance limit (6-8)
- Jitter: random detune (±cents based on intensity) + timing offset
- Fire button in `TrackRowMixer.tsx`
- Instance count indicator

**Success criteria:** Rapid-fire SFX with natural variation, respects max instance limit

#### Phase 4: Presets + Crossfade

- `PresetPanel.tsx`: save current state, list, load, overwrite, delete
- `useCrossfade` hook: linearRampToValueAtTime on gain nodes
- Presets persisted in tool state (per-campaign via canvas state)

**Success criteria:** < 5s to switch scene, smooth crossfade with no silence gap

#### Phase 5: Two Modes + Polish

- `SoundboardSimple.tsx`: stripped layout (play/vol/loop/presets only)
- `SoundboardMixer.tsx`: full layout (+ stacking, jitter, fire, tags)
- Mode toggle in toolbar/settings
- Track reorder via drag & drop (HTML5 DnD, consistent with existing cross-tool pattern)
- Track tagging UI

**Success criteria:** Both modes fully functional, mode switch preserves playback state

## System-Wide Impact

- **Canvas state size**: Soundboard state adds to the JSON blob saved per campaign. Audio file data is NOT in state (only paths), so impact is minimal.
- **Electron main process**: 4 new IPC handlers. File copy on import. No heavy processing.
- **App bundle size**: +8 CC0 samples (~2-5MB total depending on quality/length). Acceptable for desktop app.
- **No conflict with existing tools**: Soundboard is independent. Only shared pattern is patchState + tool registration.

## Acceptance Criteria

### Functional (from origin R1-R23)

- [ ] Import MP3, WAV, OGG via system dialog (R1)
- [ ] 8 bundled CC0 samples available in grid browser (R2)
- [ ] Imported files stored in campaign folder, paths in state (R3)
- [ ] Track tagging with user-defined tags (R4)
- [ ] Play/pause per track (R5)
- [ ] Loop toggle per track, default on (R6)
- [ ] Volume slider per track (R7)
- [ ] Master volume scales all proportionally (R8)
- [ ] Max 8-12 simultaneous tracks (R9)
- [ ] Stacking: max 6-8 instances per track (R10)
- [ ] Fire button triggers new stack instance (R11)
- [ ] Jitter intensity slider 0-100% (R12)
- [ ] Save preset with user name (R13)
- [ ] Presets are per-campaign (R14)
- [ ] Crossfade between presets (R15)
- [ ] Preset list with quick-switch (R16)
- [ ] Overwrite or delete+new for preset editing (R17)
- [ ] Track controls: play, vol, loop, name, tags (R18)
- [ ] Reorder, rename, delete tracks (R19)
- [ ] Waveform canvas for master output (R20)
- [ ] Add track button with import/library choice (R21)
- [ ] Master volume always visible (R22)
- [ ] Two separate layouts: simple vs mixer (R23)

### Non-Functional

- [ ] No audible artifacts with 8+ tracks playing
- [ ] Waveform renders at 30+ fps
- [ ] Crossfade duration smooth (configurable, default ~1.5s)
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

## Dependencies & Prerequisites

- `'soundboard'` tool type already registered (types.ts line ~5)
- Campaign folder structure must support `audio/` subdirectory
- CC0 samples sourced before Phase 2 (freesound.org or equivalent)
- `useChimePlayer.ts` proves Web Audio API works in this Electron setup

## Risk Analysis

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Large audio files bloat campaign folder | Medium | Document max recommended file size; no technical limit |
| AudioContext suspended on start (autoplay policy) | Low (Electron) | Resume context on first user interaction |
| Memory with many decoded buffers | Low | Decode on demand, release on track removal |
| CC0 sample sourcing | Medium | Use freesound.org; fallback to shorter/lower quality |

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-17-soundboard-requirements.md](docs/brainstorms/2026-05-17-soundboard-requirements.md) — Key decisions: Web Audio API, bundled CC0, files on disk, crossfade, stacking+jitter from v1, two layouts, per-campaign presets

### Internal References

- Tool registration: `src/ui/canvas/types.ts:5` (ToolType union)
- Tool rendering: `src/ui/canvas/InfiniteCanvas.tsx:65` (switch)
- Existing Web Audio usage: `src/ui/tools/time-session-timer/hooks/useChimePlayer.ts`
- File dialog pattern: `dialog:open-image` / `dialog:read-image` in preload.ts
- patchState pattern: used in all tools (party-tracker, map-display)
- Inspiration: `inspiracja/sound.md` (Mithos Sound Board)

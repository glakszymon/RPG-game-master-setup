---
title: "feat: Assign avatar images to SRD bestiary creatures from token pack"
type: feat
status: active
date: 2026-05-21
---

# feat: Assign avatar images to SRD bestiary creatures from token pack

## Overview

Use images from `assets/too-many-tokens-dnd-1.1.1/` (375 monster folders, each containing multiple `.webp` token variants) to populate the `avatar_path` field on seeded SRD bestiary creatures. Monsters without a matching image folder get documented in `brak_image.md`.

## Problem Statement

The 322 SRD creatures seeded from `monsters.json` currently have `avatar_path: null`. The token pack in `assets/too-many-tokens-dnd-1.1.1/` has images for ~265 of them (direct name match). Without avatars the bestiary library looks empty/generic.

## Proposed Solution

1. During `seedSrdCreatures()` (in `database.ts`), resolve `avatar_path` by matching monster name to folder name in the token pack directory.
2. Pick the first `.webp` file alphabetically from the matching folder as the avatar.
3. Store the **relative path** from project root (e.g. `assets/too-many-tokens-dnd-1.1.1/Aboleth/AbolethAberration (1).webp`).
4. Generate `brak_image.md` listing the 57 monsters with no matching folder.

## Technical Considerations

- **Image loading**: The app already uses `dialog:read-image` IPC to convert file paths to base64 data URLs (Chromium blocks `file://`). The bestiary UI presumably uses `avatar_path` with this mechanism — verify.
- **Path format**: Use path relative to app root. At runtime, resolve against `app.getAppPath()` or `__dirname` in main process.
- **Name matching**: Direct case-sensitive match covers 265/322. The remaining 57 are mostly Adult/Ancient dragons and some named variants not in the token pack.
- **Idempotency**: `seedSrdCreatures` uses `INSERT OR IGNORE` — need to also UPDATE avatar_path on re-seed or add a separate migration pass.

## Acceptance Criteria

- [ ] SRD creatures with matching token folders get `avatar_path` set during seed
- [ ] Avatar images display correctly in the bestiary library UI
- [ ] `brak_image.md` created at project root listing all monsters without images (57 expected)
- [ ] No regression in existing bestiary functionality

## Implementation Steps

### 1. `src/electron/srdConversion.ts`

- Add function `resolveAvatarPath(monsterName: string): string | null`
- Match against folder names in `assets/too-many-tokens-dnd-1.1.1/`
- Pick first `.webp` file alphabetically
- Return relative path or null

### 2. `src/electron/database.ts` — `seedSrdCreatures()`

- Call `resolveAvatarPath` for each creature
- Include `avatar_path` in the INSERT (already in schema, currently null)
- For existing rows (re-seed), UPDATE avatar_path if currently null

### 3. Generate `brak_image.md`

- Script or build-time step that outputs the missing list
- Can be a simple node script run once, or generated during seed and written via fs

### 4. Verify UI rendering

- Confirm bestiary card/detail view reads `avatar_path` and displays it
- May need to use `readImage` IPC to convert path to data URL for rendering

## Missing Monsters (57 — no image folder match)

Adult dragons (10), Ancient dragons (10), plus ~37 others including:
- Balor, Pit Fiend, Solar, Planetar, various named creatures
- Full list to be generated and saved to `brak_image.md`

## Sources

- Token pack: `assets/too-many-tokens-dnd-1.1.1/` (375 folders, ~34 images each)
- SRD seed: `src/electron/srdConversion.ts`, `src/electron/database.ts`
- Image loading: `dialog:read-image` IPC channel in `main.ts`

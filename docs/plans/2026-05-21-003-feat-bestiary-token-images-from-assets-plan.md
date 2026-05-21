---
title: "feat: Assign Token Images from Too Many Tokens Asset Pack to Bestiary"
type: feat
status: active
date: 2026-05-21
---

# feat: Assign Token Images from Too Many Tokens Asset Pack to Bestiary

## Overview

Automatically assign avatar images to SRD bestiary templates using the bundled `assets/too-many-tokens-dnd-1.1.1/` token pack. Each monster directory contains multiple `.webp` token variants — pick the first image as the default avatar. Monsters without a matching directory get documented in `brak_image.md`.

## Problem Statement

All 322 SRD creatures in the bestiary currently have `avatar_path: null`. The project already ships with 375+ token directories in `assets/too-many-tokens-dnd-1.1.1/`, but they aren't wired up. Users see blank avatars for every creature.

## Proposed Solution

Modify the SRD seeding process (`src/electron/srdConversion.ts` and/or `src/electron/database.ts`) to:

1. During `seedBestiaryFromSrd()`, look up matching token directory for each monster name
2. Read the first `.webp` file from that directory, convert to base64 data URL
3. Store it as `avatar_path` in `bestiary_templates`
4. Generate `brak_image.md` listing the 57 monsters without matching tokens

## Technical Considerations

- **avatar_path format**: The UI expects base64 data URLs (`data:image/webp;base64,...`)
- **File size**: webp tokens are small (~50-200KB each), base64 encoding adds ~33% overhead — acceptable for SQLite storage
- **Name matching**: Monster names in `monsters.json` match directory names exactly in most cases (265/322). The 57 mismatches are mostly Adult/Ancient dragons, some compound names
- **Performance**: Reading 265 image files during seeding is a one-time cost on first launch
- **Idempotency**: The seed function already checks `WHERE id = 'srd-aboleth'` — needs to also update existing rows with null avatar_path

## Acceptance Criteria

- [ ] SRD creatures with matching token directories get first `.webp` as avatar
- [ ] `brak_image.md` created at project root listing 57 monsters without images
- [ ] Existing bestiary entries with user-uploaded avatars are NOT overwritten
- [ ] Build passes (`npm run build && npm run lint`)

## Implementation Plan

### Phase 1: Image Assignment in SRD Seeding

**File: `src/electron/srdConversion.ts`**

- Add function `resolveTokenAvatarPath(monsterName: string): string | null`
  - Check if `assets/too-many-tokens-dnd-1.1.1/<monsterName>/` exists
  - Read first `.webp` file alphabetically
  - Return base64 data URL or null

- Modify `convertSrdMonster()` to call this and set `avatar_path`

**File: `src/electron/database.ts`**

- In `seedBestiaryFromSrd()`, pass resolved avatar paths
- Update INSERT to not overwrite existing non-null avatar_path values:
  ```sql
  avatar_path = CASE WHEN bestiary_templates.avatar_path IS NULL 
                     THEN excluded.avatar_path 
                     ELSE bestiary_templates.avatar_path END
  ```

### Phase 2: Missing Images Documentation

**File: `brak_image.md` (project root)**

Create markdown listing all 57 monsters without token images:

```
# Potwory bez dostępnych grafik tokenów

Poniższe potwory z SRD nie mają odpowiadających grafik w paczce Too Many Tokens:

- Adult Black Dragon
- Adult Blue Dragon
...
```

## Missing Monsters (57)

These SRD creatures have no matching directory in the token pack:

- Adult Black Dragon, Adult Blue Dragon, Adult Brass Dragon, Adult Bronze Dragon, Adult Copper Dragon
- Adult Gold Dragon, Adult Green Dragon, Adult Red Dragon, Adult Silver Dragon, Adult White Dragon
- Ancient Black Dragon, Ancient Blue Dragon, Ancient Brass Dragon, Ancient Bronze Dragon, Ancient Copper Dragon
- Ancient Gold Dragon, Ancient Green Dragon, Ancient Red Dragon, Ancient Silver Dragon, Ancient White Dragon
- Androsphinx, Archmage, Balor, Behir, Deep Gnome (Svirfneblin)
- Djinni, Dragon Turtle, Efreeti, Erinyes, Giant Rat (Diseased)
- Giant Sea Horse, Grick, Gynosphinx, Half-Red Dragon Veteran, Hell Hound
- Horned Devil, Ice Devil, Iron Golem, Kraken, Lich
- Marilith, Mummy Lord, Nalfeshnee, Otyugh, Pit Fiend
- Planetar, Purple Worm, Rakshasa, Remorhaz, Roc
- Solar, Spy, Storm Giant, Succubus/Incubus, Tarrasque, Vampire, Xorn

## Sources

- Token pack: `assets/too-many-tokens-dnd-1.1.1/` (375 directories, ~webp format)
- Monster data: `assets/monsters.json` (322 SRD creatures)
- Seeding logic: `src/electron/database.ts:626` and `src/electron/srdConversion.ts`

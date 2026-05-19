---
date: 2026-05-19
topic: module-dependency-graph
---

# Module Dependency Graph — Instance-Based Architecture

## Problem Frame

The application's modules (Notepad, Bestiary, Encounter Sets, Map Display, Combat Tracker, Party Tracker) need to work as a connected pipeline where creature data flows through a consistent instance model. Currently some connections exist but bypass the instance system, and key integrations are missing.

## Requirements

### Instance Model (Core Change)

- R1. Encounter Sets is the central registry of creature instances. A creature instance is created from a Bestiary template and can have per-instance overrides.
- R2. Map Display tokens for creatures MUST reference an existing instance in Encounter Sets (same ID, not a copy).
- R3. Preset Editor (in Notepad) operates on template references — it is exempt from R2 because it is a design-time tool.
- R4. When a map preset is loaded, instances are created in Encounter Sets from template references, then placed on the map.

### Notepad → Encounter Sets

- R5. A button in the Notepad note ("Create Encounter Group") takes all @mentioned creatures from that note and creates an Encounter Set with instances for each.
- R6. When loading a map preset, the system automatically creates an Encounter Set group from the note's @mentions (or reuses existing instances if they already exist for the same template + note combination).

### Blocking Bestiary → Map Display

- R7. Remove direct drag & drop from Bestiary to Map Display. Creatures can only reach the map via Encounter Sets (drag instance from ES to map).

### Encounter Sets → Map Display

- R8. Drag & drop from Encounter Sets to Map Display places the instance as a token on the map (this is now the only path for creatures onto the map).

### Preset Editor Adjustments

- R9. Preset Editor must be updated to store template references (not instance IDs) so that instances are created at load-time per R4/R6.

### Reuse Logic

- R10. When loading a preset or creating an encounter group, the system checks for existing instances (same template + same source note) and reuses them instead of creating duplicates.

### Cascade Deletion

- R11. Deleting an instance from Encounter Sets cascades: removes the associated token from Map Display and combatant from Combat Tracker, with a confirmation dialog warning the user of consequences.

## Scope Boundaries

- Party Tracker → Map Display and Party Tracker → Combat Tracker remain unchanged.
- Combat Tracker → Map Display (animations/VFX) is out of scope — existing functionality, to be expanded later.
- Bestiary → Encounter Sets drag & drop remains unchanged.
- Bestiary → Notepad (@mention system) remains unchanged — already works.
- The "@mention" UI in Notepad stays as-is.

## Success Criteria

- A creature placed on the map always references an ES instance (verifiable by ID).
- Dragging from Bestiary directly onto Map Display is not possible.
- Loading a map preset creates ES instances and places them on map in one action.
- "Create Encounter Group" button in Notepad creates an ES group from @mentions.
- No duplicate instances when the same operation is repeated.

## Key Decisions

- **Instance model over shared references**: Encounter Sets holds instances (template + overrides), not raw Bestiary templates. All downstream modules (Map, Combat) reference instance IDs.
- **Preset Editor exempt from instance requirement**: It's a design tool that stores template refs, not live instances.
- **Reuse over duplication**: Loading preset or creating group reuses matching existing instances.
- **Block Bestiary → Map**: Forces the instance pipeline (Bestiary → ES → Map).

## Dependencies / Assumptions

- Encounter Sets already supports creating instances from Bestiary templates (confirmed working).
- The `entityMention` node in Notepad stores `entityId` which is the Bestiary template ID.
- Map Display already supports token drops with `application/json` payloads.

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] How to migrate existing map tokens that were created via direct Bestiary drag (they have template IDs, not instance IDs)?
- [Affects R10][Technical] What key identifies "same instance" for reuse — template ID + note ID, or template ID + note ID + position?
- [Affects R4][Technical] How should the load-preset flow coordinate between creating ES instances and updating Map Display state atomically?

## Next Steps

→ `/ce:plan` for structured implementation planning

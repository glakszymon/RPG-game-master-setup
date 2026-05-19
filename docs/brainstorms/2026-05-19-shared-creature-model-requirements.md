---
date: 2026-05-19
topic: shared-creature-model
---

# Shared Creature Model - Cross-Tool Synchronization

## Problem Frame

Currently each tool (Bestiary, Map, Combat Tracker, Notepad, Encounter Sets) manages creature data independently. The GM wants a single source of truth for creature templates, with live propagation of template changes across all tools, and per-instance overrides only for combat state (HP). The workflow must enforce that creatures reach the map only through the Encounter Set pipeline.

## Requirements

### Bestiary (Source of Truth)

- R1. Bestiary is the single source of truth for creature templates (stats, AC, attacks, abilities, traits)
- R2. Editing a template in Bestiary propagates changes to all existing instances that reference it (AC, attacks, abilities update everywhere)

### Notepad (Session Prep)

- R3. Notepad supports `@` command to reference/embed a Bestiary creature as a read-only inline block (autocomplete searches Bestiary only, not Party Tracker)
- R4. Multiple `@Goblin` references in one note = multiple distinct instances planned
- R5. One-button "Create Encounter Set" extracts all `@`-referenced creatures from the note into a new Encounter Set

### Encounter Sets (Staging)

- R6. Encounter Sets are ordered lists of creature instances, each referencing a Bestiary template by ID
- R7. Each entry in an Encounter Set = exactly 1 instance (want 3 goblins = 3 entries)
- R8. Encounter Set is the mandatory gateway to the map - no creature token can exist on the map without a corresponding Encounter Set entry
- R9. Encounter Sets are re-usable. Each use in Combat Tracker creates fresh instances (full HP, no initiative)
- R10. Removing an entry from Encounter Set while its instance is active on map/combat shows a warning and requires confirmation before cascade-deleting

### Map (Spatial)

- R11. Map tokens for creatures must reference an Encounter Set entry (1:1 mapping, one entry = one token max)
- R12. Players (party members) are exempt from the Encounter Set requirement - they can be placed freely
- R13. Token on map = only position + visual. Stats inherited from template, HP from shared instance

### Combat Tracker (Tactical)

- R14. Combat Tracker receives creatures from Encounter Sets, creating instances with local HP + initiative
- R15. A creature instance in Combat Tracker and its token on the map share the same HP state (damage in one = damage in the other)

### Instance Model

- R16. Each instance has a unique identity (e.g. "Goblin #1", "Goblin #2") with its own HP, but shares all other stats from the template
- R17. Instance-local fields: HP (current), position (on map), initiative (in combat). All other stats read from template.

## Success Criteria

- Changing AC in Bestiary template immediately reflects in Combat Tracker, Map token tooltip, and Notepad embed
- GM can write a note with `@Goblin @Goblin @Orc`, click one button, and get an Encounter Set with 3 entries
- Trying to place a creature on the map without it being in an Encounter Set is impossible (UI prevents it)
- Damage dealt in Combat Tracker updates the same creature's HP shown on the map token
- GM flow: Notepad -> Encounter Set -> Map/Combat Tracker (enforced pipeline)
- Re-using an Encounter Set creates fresh instances with full HP

## Scope Boundaries

- NOT building AI/auto-parsing of creature stats from text
- NOT implementing undo across tools (each tool keeps its own undo)
- NOT adding network sync / multiplayer - this is local single-user
- NOT allowing direct creature creation on the map (must go through Encounter Set)
- `@` command searches Bestiary only (not Party Tracker players)

## Key Decisions

- **Template vs Instance model**: Template holds canonical stats, instance holds only HP + position + initiative. Instance references template by ID.
- **Propagation is live**: Instances always read current template values except for overridden fields (HP).
- **Map token = Combat Tracker instance**: Same creature instance appears in both places, not two separate copies.
- **Notepad = read-only embed**: Notepad shows creature data but doesn't edit it (edit happens in Bestiary).
- **Encounter Set = mandatory gateway**: Creatures MUST exist in an Encounter Set before appearing on map.
- **1:1 Encounter Set entry to map token**: Each entry is a unique instance. No "x3" multipliers.
- **`@` command in Notepad**: Typeahead search of Bestiary creatures, inserts inline embed block.
- **Encounter Sets are re-usable**: Same set can be deployed multiple times, each creating fresh instances.
- **Deletion with warning**: Removing from Encounter Set warns if instance is active on map/in combat, requires confirmation.

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] How to implement the template-instance reference system within the existing WindowState/toolState architecture
- [Affects R2][Technical] How to notify other tools when a template changes (event bus, shared state, or re-read on render)
- [Affects R15][Technical] How map tokens and combat tracker share the same instance state (shared instance store)
- [Affects R3][Needs research] How to implement the `@` mention/embed block in the Notepad extension system
- [Affects R8][Technical] How to enforce the Encounter Set constraint in the map UI (disable token creation, only allow drag from Encounter Set)
- [Affects R9][Technical] How to manage instance lifecycle (creation on deploy, cleanup after combat ends)

## Next Steps

-> `/ce:plan` for structured implementation planning

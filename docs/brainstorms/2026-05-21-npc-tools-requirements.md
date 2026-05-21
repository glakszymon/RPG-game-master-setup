---
date: 2026-05-21
topic: npc-tools
---

# NPC Tools

## Problem Frame

GMs need to quickly create, store, and retrieve NPCs during sessions. Currently there is no NPC management in Game Master Panel — GMs must track characters externally or improvise without reference. The tool should let GMs build a searchable library of recurring NPCs and generate new ones on-the-fly when players go off-script.

## Requirements

- R1. Single tool window with two tabs: **NPC Library** and **NPC Generator**
- R2. NPC Library displays a searchable, filterable list of all saved NPCs for the active campaign
- R3. NPC fields: Name, Type/Role, Tags (multi-value), Description, Notes, Portrait image, plus user-defined custom fields
- R4. Custom fields are configurable per campaign (user adds/removes field definitions; each NPC gets values for those fields)
- R5. Search by name; filter by tags
- R6. No folder hierarchy — tags are the sole organizational mechanism
- R7. CRUD operations: create, view/edit (inline detail view), delete NPC
- R8. NPC Generator tab: user selects Name Type and Gender, clicks Generate to produce randomized Name, Role, Description, Age
- R9. Generation uses predefined lists (no AI/LLM) — random selection from name lists, role lists, trait/description templates, age ranges
- R10. Wbudowane domyślne listy imion (np. fantasy, słowiańskie) available out-of-the-box
- R11. Custom name lists: user imports JSON file to add custom name types to the generator
- R12. Save generated NPC to library with one click
- R13. NPC portrait: upload image from disk (same mechanism as map images — IPC dialog:read-image → base64)
- R14. Built-in avatar gallery: bundled set of generic portraits user can pick from without uploading
- R15. Integration — drag NPC from library onto map canvas to place as token; token displays NPC portrait + name as label
- R16. Integration — drag NPC from library into combat tracker window to add as combatant
- R17. When NPC is added to combat tracker, custom fields with matching names (e.g. "HP" → HP, "AC" → AC) auto-populate combat stats; convention-based mapping, no configuration needed

## Success Criteria

- GM can generate a random NPC and save it to the library in under 5 seconds
- GM can find a previously saved NPC by name or tag within the library
- NPC portraits appear as tokens on the map after drag-and-drop
- Custom fields persist across sessions and are campaign-specific

## Scope Boundaries

- No folder/tree hierarchy — tags only
- No AI/LLM generation — pure randomization from lists
- No export/import of full NPC library (deferred)
- No linking token-click back to NPC detail view (deferred)
- No relationship/faction graph between NPCs

## Key Decisions

- **Single window with tabs** over separate windows: keeps NPC workflow cohesive, reduces canvas clutter
- **Tags-only organization** over folders: simpler UX, avoids tree management complexity, tags are more flexible
- **Randomization from lists** over LLM: no external dependency, instant results, works offline
- **Built-in avatar gallery** included: low-cost addition that makes NPC creation faster when user has no custom art

## Dependencies / Assumptions

- Portrait storage reuses existing base64/IPC image pattern from map tool
- Combat tracker and map tool must expose an API/mechanism to receive NPC data (drag-and-drop or IPC)
- SQLite schema will need NPC and custom field tables per campaign

## Outstanding Questions

### Resolve Before Planning

(none)

### Deferred to Planning

- [Affects R14][Needs research] What bundled avatar set to use? (license-compatible generic fantasy portraits)
- [Affects R15][Technical] How to implement cross-window drag-and-drop from NPC Library to map canvas
- [Affects R16][Technical] Interface contract between NPC tool and combat tracker for adding combatants
- [Affects R4][Technical] SQLite schema design for campaign-scoped custom field definitions + values
- [Affects R9][Technical] Structure of built-in name/role/description lists and JSON import format

## Next Steps

→ `/ce:plan` for structured implementation planning

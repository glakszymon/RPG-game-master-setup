---
date: 2026-05-17
topic: bestiary-field-types-config
---

# Bestiary — Konfiguracja typów pól formularza

## Problem Frame

Pola formularza bestii mają nieodpowiednie typy inputów — np. alignment jako radio z 11 opcjami zamiast dropdown, skills bez wartości numerycznych, speed jako wolne tagi zamiast strukturyzowanych typów ruchu. Trzeba ustalić docelowy typ każdego pola, jego opcje i lokalizację.

## Requirements

### Sticky Header
- R1. **Alignment (Charakter)** — dropdown/select z 11 opcjami: Lawful Good, Neutral Good, Chaotic Good, Lawful Neutral, True Neutral, Chaotic Neutral, Lawful Evil, Neutral Evil, Chaotic Evil, Unaligned, Any Alignment
- R2. **CR (Poziom Wyzwania)** — pole numeryczne (float), dowolna wartość

### Lewa kolumna — Combat
- R3. **AC (Klasa Pancerza)** — number, zakres 1-30
- R4. **Initiative (Inicjatywa)** — number, zakres -5 do 30
- R5. **HP (Punkty Wytrzymałości)** — number, zakres 1-999
- R6. **HP Formula (Formuła HP)** — text field (np. "8d10+40")
- R7. **Speed (Szybkość)** — lista typów ruchu z polem numerycznym na wartość. Walk (Chodzenie) zawsze widoczny, pozostałe dodawane przyciskiem +: Fly (Latanie), Swim (Pływanie), Burrow (Kopanie), Climb (Wspinaczka). 5 typów standardowych, bez custom.

### Lewa kolumna — Ability Scores (Cechy Główne)
- R8. **Ability Scores** — 6 cech (STR/Siła, DEX/Zręczność, CON/Kondycja, INT/Inteligencja, WIS/Mądrość, CHA/Charyzma), każda z 3 polami numerycznymi: Score, MOD, SAVE. Wszystkie ręczne (bez auto-wyliczania).

### Lewa kolumna — Skills (Umiejętności)
- R9. **Skills (Umiejętności)** — dropdown z 18 umiejętności D&D + przycisk "Dodaj". Każdy dodany skill ma pole numeryczne na bonus. Opcje: Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival.

### Lewa kolumna — Defenses (Obrony)
- R10. **Resistances (Odporności)** — wybieranie z listy 13 damage types + custom. Opcje: Acid, Cold, Fire, Force, Lightning, Necrotic, Poison, Psychic, Radiant, Thunder, Bludgeoning, Piercing, Slashing.
- R11. **Vulnerabilities (Podatności)** — jak R10 (13 damage types + custom)
- R12. **Damage Immunities (Odporności na obrażenia)** — jak R10 (13 damage types + custom)
- R13. **Condition Immunities (Odporności na stany)** — wybieranie z listy 15 conditions + custom. Opcje: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious.

### Lewa kolumna — Senses & Languages
- R14. **Senses (Zmysły)** — wybierasz typ zmysłu z listy (+ custom) + pole numeryczne na zasięg. Typy: Darkvision, Blindsight, Tremorsense, Truesight + custom.
- R15. **Languages (Języki)** — wybieranie z predefiniowanej listy + custom. Opcje: Common, Draconic, Elvish, Dwarvish, Infernal, Abyssal, Celestial, Primordial, Sylvan, Undercommon, Deep Speech, Giant, Goblin, Orc, Telepathy.

### Lewa kolumna — Info
- R16. **Size (Rozmiar)** — dropdown/select z 6 opcjami: Tiny, Small, Medium, Large, Huge, Gargantuan
- R17. **Creature Type (Typ Stworzenia)** — dropdown/select z 14 opcjami: Aberration, Beast, Celestial, Construct, Dragon, Elemental, Fey, Fiend, Giant, Humanoid, Monstrosity, Ooze, Plant, Undead
- R18. **Descriptive Tags** — USUNIĘTE
- R19. **Gear (Wyposażenie)** — lista elementów dodawanych przyciskiem +, każdy z polem tekstowym na nazwę + polem numerycznym na ilość

### Prawa kolumna
- R20. **Traits (Cechy)** — action-list bez pól combat (nazwa + opis)
- R21. **Actions (Akcje)** — action-list z polami combat (nazwa, opis, toHit, damage, reach, saveDC, saveAbility, usageLimit)
- R22. **Bonus Actions (Akcje Dodatkowe)** — jak R21 (z combat)
- R23. **Reactions (Reakcje)** — action-list bez pól combat (nazwa + opis)
- R24. **Legendary Actions (Akcje Legendarne)** — jak R21 (z combat)

## Success Criteria

- Każde pole ma typ inputa odpowiedni do swoich danych (dropdown zamiast radio dla długich list, numeryczne dla liczb)
- Pola z predefiniowanymi opcjami mają wybieranie z listy (nie ręczne wpisywanie)
- Pola złożone (Speed, Skills, Senses, Gear) mają strukturyzowane sub-pola

## Scope Boundaries

- Nie zmieniamy layoutu dwukolumnowego (ustalony wcześniej)
- Nie zmieniamy prawej kolumny (action-list zostaje)
- Nie dodajemy nowych pól poza ustalonymi
- Usuwamy Descriptive Tags

## Key Decisions

- **Dropdown zamiast radio** dla Alignment, Size, Creature Type — mniej miejsca, lepsza czytelność
- **CR jako float number** — prostsze niż dropdown z ułamkami
- **Speed jako strukturyzowana lista** — Walk stały + opcjonalne typy ruchu z osobnymi polami
- **Ability Scores 3 pola** — Score, MOD, SAVE — wszystkie ręczne bez auto-wyliczania
- **Skills z bonusem** — dropdown wyboru + pole numeryczne
- **Defenses/Senses/Languages** — wybieranie z predefiniowanej listy + custom
- **Gear** — nazwa + ilość (wolny tekst + number)
- **Usunięcie Descriptive Tags** — niepotrzebne

## Outstanding Questions

### Deferred to Planning
- [Affects R1, R16, R17][Technical] Potrzebny nowy typ pola `select`/`dropdown` w FieldInput — obecnie nie istnieje w dynamic-fields
- [Affects R7][Technical] Nowy typ pola `speed-list` lub generyczny `keyed-number-list` dla Speed
- [Affects R8][Technical] Rozszerzenie `stat-block` o pole MOD i SAVE (obecnie ma tylko scores + saves)
- [Affects R9][Technical] Nowy typ pola lub rozszerzenie tag-list o wartość numeryczną per tag
- [Affects R14][Technical] Nowy typ pola dla zmysłów (typ + zasięg) — podobny do Speed
- [Affects R19][Technical] Nowy typ pola `item-list` (nazwa + ilość)

## Next Steps

→ `/ce:plan` for structured implementation planning

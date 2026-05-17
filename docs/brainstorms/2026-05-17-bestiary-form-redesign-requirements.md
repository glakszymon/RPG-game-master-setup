---
date: 2026-05-17
topic: bestiary-form-redesign
---

# Bestiary Form — Redesign struktury i czytelności

## Problem Frame

Aktualny formularz bestii (CreatureForm) jest długi, nieczytelny i źle zorganizowany. Sekcje zwijalne na jednej kolumnie powodują ciągłe scrollowanie. Istnieją dwa niespójne formularze (CreatureForm dynamiczny vs InstanceForm statyczny). Interakcja z polami jest niewygodna, a wizualnie formularz nie wykorzystuje dostępnej przestrzeni.

## Requirements

- R1. **Dwukolumnowy layout (40/60)** — lewa kolumna zawiera dane liczbowe i krótkie pola, prawa kolumna zawiera treści tekstowe (cechy, akcje)
- R2. **Sticky nagłówek** — zawsze widoczny u góry formularza: nazwa, avatar, alignment, CR. Nie znika przy scrollowaniu
- R3. **Wspólny scroll** — obie kolumny scrollują się razem jako jedna strona (nie niezależne panele)
- R4. **Sekcje z nagłówkami bez zwijania** — widoczne nagłówki sekcji z lekkim separatorem, ale bez mechanizmu collapse/expand
- R5. **Lewa kolumna — 6 sekcji** w kolejności:
  1. Combat (AC, HP, HP formula, Initiative, Speed)
  2. Ability Scores (6 statystyk w gridzie)
  3. Skills (biegłości)
  4. Defenses (resistances, vulnerabilities, immunities_damage, immunities_condition)
  5. Senses & Languages
  6. Info (typ, rozmiar, gear, descriptive tags)
- R6. **Prawa kolumna — 5 sekcji** w kolejności:
  1. Traits
  2. Actions
  3. Bonus Actions
  4. Reactions
  5. Legendary Actions
- R7. **Poprawa wizualna** — lepszy spacing, czytelniejsza typografia, wykorzystanie glassmorphism design systemu
- R8. **Zachowanie dynamicznego systemu pól** — formularz nadal renderuje pola z konfigurowalnej struktury (FieldStructure), zmienia się tylko layout i przypisanie pól do kolumn/sekcji

## Scope Boundaries

- NIE zmieniamy systemu typów pól (radio, tag-list, stat-block, action-list itd.)
- NIE zmieniamy persystencji ani IPC — dane zapisują się tak samo
- NIE unifikujemy CreatureForm i InstanceForm w tym etapie (to osobny krok)
- NIE zmieniamy lewego panelu biblioteki (lista szablonów) — tylko prawy panel z formularzem
- NIE dodajemy nowych pól — tylko przeorganizowujemy istniejące

## Success Criteria

- Formularz jest czytelny bez scrollowania więcej niż 1-2 ekrany
- Użytkownik widzi nazwę i CR bestii cały czas (sticky header)
- Dane liczbowe i tekstowe są wizualnie oddzielone w dwóch kolumnach
- Sekcje są jasno oznaczone ale nie zabierają miejsca na zwijanie

## Key Decisions

- **40/60 proporcje kolumn**: lewa węższa bo pola liczbowe zajmują mniej miejsca
- **Bez collapse**: sekcje zawsze rozwinięte — formularz jest krótszy dzięki dwóm kolumnom
- **Sticky nagłówek zawiera alignment i CR** zamiast typ/rozmiar (te idą do sekcji Info w lewej kolumnie)
- **Wspólny scroll**: prostsze w implementacji, bardziej naturalne jak dokument

## Dependencies / Assumptions

- Dynamiczny system pól (defaultCreatureStructure.ts, useCreatureStructure) musi obsłużyć przypisanie pola do kolumny (left/right)
- Obecne width pól ('1/3', '1/2', '2/3', 'full') działa w kontekście jednej kolumny

## Outstanding Questions

### Deferred to Planning
- [Affects R8][Technical] Jak rozszerzyć FieldDefinition o `column: 'left' | 'right'` bez łamania istniejącej konfiguracji
- [Affects R2][Technical] Jak zaimplementować sticky header z dynamicznymi polami (CR i alignment to pola z FieldStructure)
- [Affects R5-R6][Technical] Czy sekcje w defaultCreatureStructure powinny mieć atrybut `column` czy lepiej mapować sectionId → column w komponencie

## Next Steps

→ `/ce:plan` for structured implementation planning

---
date: 2026-05-16
topic: bestiary-dynamic-creator
---

# Bestiary — Dynamic Creature Creator (Party Tracker Model)

## Problem Frame

Obecny kreator potworów ma sztywny schemat D&D 5e z możliwością ukrywania sekcji, ale nie pozwala użytkownikowi definiować własnych pól, typów ani układu. Party tracker ma w pełni dynamiczny system (CardStructure + FieldDefinition) który jest znacznie bardziej elastyczny. Kreator potworów powinien działać identycznie — wspólna struktura pól per kampania, edytowalna w ustawieniach, z domyślnym presetem D&D 2024.

Dodatkowo obecny kreator nie pokrywa wszystkich statystyk z Monster Manual 2024 (brakuje: Initiative, Size, Alignment, Descriptive Tags, Skills, Resistances, Vulnerabilities, Immunities, Gear, Senses, Languages, XP/PB, Bonus Actions, Reactions, Spellcasting, Limited Usage).

## Requirements

- R1. **Wspólna CreatureStructure per kampania** — analogicznie do `CardStructure` w party tracker. Definiuje jakie pola istnieją, ich typy, szerokości, ustawienia. Edytowana w Campaign Settings.
- R2. **Dane potwora jako key-value** — `fieldValues: Record<string, FieldValue>` (jak `Character` w party tracker). Szablon i instancja przechowują wartości odwołujące się do definicji pól w CreatureStructure.
- R3. **Bazowe typy pól z party tracker** — `number`, `bubbles`, `text-field`, `text-box`, `radio`, `checkbox` z identyczną konfiguracją (width, textAlign, settings).
- R4. **Nowy typ: `action-list`** — strukturyzowana lista akcji. Każda akcja: name, description, toHit (optional), damage (optional), reach/range (optional), save DC (optional), usage limit (optional: X/Day, Recharge X-Y). Pole wyświetla listę z możliwością dodawania/usuwania/edycji wpisów.
- R5. **Nowy typ: `tag-list`** — lista tagów/słów. Używane do: resistances, immunities, vulnerabilities, languages, senses, gear, descriptive tags. Wyświetla się jako tagi z auto-complete (opcjonalnie predefiniowane opcje w settings pola).
- R6. **Nowy typ: `stat-block`** — kompaktowy layout 6 ability scores (STR/DEX/CON/INT/WIS/CHA) z modyfikatorami i saving throws. Jedno pole = cały blok 6 statystyk. Value: `{ str: number, dex: number, ... , saves: { str?: number, dex?: number, ... } }`.
- R7. **Domyślny preset D&D 2024** — nowa kampania startuje z CreatureStructure zawierającą pola pokrywające pełen stat block z MM 2024:
  - Basic: Name (text-field), Size (radio: Tiny/Small/Medium/Large/Huge/Gargantuan), Creature Type (radio: 14 typów), Descriptive Tags (tag-list), Alignment (radio: 10 opcji)
  - Combat: AC (number), Initiative (number), HP Default (number), HP Formula (text-field), Speed (tag-list z wartościami jak "30 ft.", "Fly 60 ft.")
  - Abilities: Ability Scores (stat-block)
  - Skills: Skills (tag-list z wartościami jak "Perception +4")
  - Defenses: Resistances (tag-list), Vulnerabilities (tag-list), Immunities — damage (tag-list), Immunities — condition (tag-list)
  - Info: Senses (tag-list), Languages (tag-list), CR (text-field), Gear (tag-list)
  - Traits: Traits (action-list — name + description, bez toHit/damage)
  - Actions: Actions (action-list), Bonus Actions (action-list), Reactions (action-list), Legendary Actions (action-list)
- R8. **Edytor struktury w Campaign Settings** — UI analogiczny do party tracker CardStructure editor. Dodawanie/usuwanie/reordering pól, zmiana typu, szerokości, ustawień. Zastępuje obecny CreatureFormTab.
- R9. **Auto-migracja** — przy ładowaniu kampanii ze starym formatem (CreatureTemplate ze sztywnym schematem), automatyczna konwersja do nowego formatu (CreatureStructure + fieldValues). Jednokierunkowa, nieodwracalna.
- R10. **Zachowanie template/instance hierarchy** — instancje nadal referują szablony i mogą nadpisywać pojedyncze pola. Mechanizm override działa per field ID z CreatureStructure.
- R11. **XP i Proficiency Bonus automatyczne** — jeśli istnieje pole CR, system automatycznie wylicza XP i PB wg tabel MM 2024. Wyświetlane read-only obok CR.
- R12. **Sekcje/grupy pól** — pola w CreatureStructure mogą być grupowane w nazwie sekcje (jak w presecie: Basic, Combat, Abilities...). Sekcje zwijalne w formularzu.

## Success Criteria

- Kreator potworów obsługuje 100% pól z stat blocku MM 2024 bez custom fields
- Użytkownik może dodać/usunąć dowolne pole lub zmienić strukturę dla innego systemu RPG (nie tylko D&D)
- Istniejące potwory z obecnego formatu działają po migracji bez utraty danych
- UX edycji potwora jest spójny z UX edycji postaci w party tracker

## Scope Boundaries

- Brak wielu presetów do wyboru (tylko D&D 2024 domyślnie) — inne presety to future work
- Brak importu z zewnętrznych źródeł
- Nie zmieniamy drzewka encounter sets, drag & drop, ani dwu-panelowego layoutu (R3-R12 z oryginalnych wymagań bestiary)
- Brak walidacji stat blocku (np. czy CR odpowiada HP/AC) — to narzędzie do zapisu, nie kalkulator
- Spellcasting modelowany jako action-list z opisem w polu description (brak dedykowanego spell-list typu na start)

## Key Decisions

- **Pełna dynamiczność jak party tracker** — porzucamy sztywny schemat CreatureTemplate na rzecz CreatureStructure + fieldValues
- **Trzy nowe typy pól** — `action-list`, `tag-list`, `stat-block` rozszerzają bazowe typy z party tracker
- **D&D 2024 jako edytowalny default** — nie preset do załadowania, lecz domyślna struktura nowej kampanii
- **Wspólna struktura per kampania** — wszystkie potwory w kampanii mają ten sam zestaw pól
- **Auto-migracja jednokierunkowa** — stary format konwertowany automatycznie

## Dependencies / Assumptions

- Party tracker CardStructure editor istnieje i działa — wzorujemy się na nim
- Obecna persystencja bestiary (SQLite) musi obsłużyć nowy format (prawdopodobnie zmiana schematu tabeli)

## Outstanding Questions

### Deferred to Planning
- [Affects R9][Technical] Jak dokładnie mapować stare pola CreatureTemplate na nowy format fieldValues — potrzebna analiza wszystkich istniejących pól
- [Affects R4][Needs research] Czy action-list powinien mieć sub-typy (attack vs trait vs spell) czy jeden uniwersalny format z opcjonalnymi polami
- [Affects R8][Technical] Czy reużyć komponent CardStructure editora z party tracker czy stworzyć shared abstraction
- [Affects R6][Technical] Format przechowywania stat-block value w JSON — flat object vs nested

## Next Steps

→ `/ce:plan` for structured implementation planning

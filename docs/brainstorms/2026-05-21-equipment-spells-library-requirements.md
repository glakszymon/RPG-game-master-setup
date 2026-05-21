---
date: 2026-05-21
topic: equipment-spells-library
---

# Equipment & Spells Library

## Problem Frame
GM potrzebuje szybkiego dostępu do referencji przedmiotów i zaklęć podczas sesji. Obecnie nie ma w aplikacji narzędzia do przeglądania/wyszukiwania ekwipunku ani magii — GM musi korzystać z zewnętrznych źródeł.

## Requirements

- R1. Jedno narzędzie (tool window na canvasie) z pięcioma kategoriami: Broń, Zbroje, Ekwipunek, Magiczne przedmioty, Zaklęcia
- R2. Layout wzorowany na bestiariuszu: lewy panel z listą + filtry/wyszukiwarka, prawy panel ze szczegółami wybranego wpisu
- R3. Seed SRD 5e przy pierwszym uruchomieniu (idempotent) — setki gotowych wpisów
- R4. Pola danych zgodne z SRD 5e:
  - Przedmioty: nazwa, typ, rzadkość, waga, cena, opis, właściwości
  - Zaklęcia: nazwa, poziom, szkoła, czas rzucania, zasięg, komponenty, czas trwania, opis
- R5. Użytkownik może dodawać własne wpisy (custom) obok SRD; wpisy custom oznaczone wizualnie
- R6. Filtrowanie po: kategorii, rzadkości (przedmioty), poziomie/szkole (zaklęcia), wyszukiwanie po nazwie
- R7. Drag & drop wpisu do party tracker — przypisanie przedmiotu/zaklęcia do postaci

## Success Criteria

- GM może znaleźć dowolny przedmiot/zaklęcie SRD w < 5 sekund
- Custom wpisy są persystowane w SQLite i przeżywają restart
- Drag & drop działa płynnie z party tracker

## Scope Boundaries

- Brak integracji z combat tracker i mapą w pierwszej wersji
- Brak importu/eksportu z plików zewnętrznych
- Brak edycji wpisów SRD (read-only); edytowalne tylko custom wpisy
- Brak systemu "ulubionych" czy "przygotowanych zaklęć" — to ewentualny follow-up

## Key Decisions

- **Jedna biblioteka z kategoriami** zamiast osobnych narzędzi — mniej clutteru na canvasie, spójny UX
- **Wzorzec bestiariusza** — proven pattern w tej aplikacji, minimalizuje nowy kod
- **SRD 5e seed** — natychmiastowa wartość bez ręcznego wpisywania
- **Pięć kategorii** (Broń, Zbroje, Ekwipunek, Magic Items, Spells) — pokrywa pełne potrzeby sesji

## Dependencies / Assumptions

- Party tracker musi obsługiwać przyjmowanie drag & drop z nowego narzędzia (rozszerzenie istniejącego DnD)
- Dane SRD 5e dostępne jako JSON do seeda (Open Gaming License)

## Outstanding Questions

### Deferred to Planning
- [Affects R3][Needs research] Źródło danych SRD — skąd pobrać/wygenerować JSON z przedmiotami i zaklęciami 5e
- [Affects R4][Technical] Schemat tabel SQLite — jedna tabela z kolumną `category` czy osobne tabele per typ
- [Affects R7][Technical] Jak party tracker przechowuje przypisane przedmioty/zaklęcia (nowa tabela? pole JSON w postaci?)

## Next Steps

→ `/ce:plan` for structured implementation planning

---
date: 2026-05-14
topic: design-system
---

# Design System — Game Master Panel

## Problem Frame

Aplikacja jest na wczesnym etapie (scaffold) i nie ma żadnego design systemu. Zanim zaczniemy budować UI, potrzebujemy spójnych tokenów, komponentów i zasad wizualnych. Aplikacja to desktop Electron tool dla Game Masterów RPG — musi być czytelna podczas wielogodzinnych sesji, funkcjonalna, z subtelnymi fantasy akcentami.

## Requirements

### Charakter wizualny
- R1. Dark mode jako jedyny tryb — brak light mode
- R2. Styl glassmorphism: półprzezroczyste tła z backdrop-blur na surface elementach
- R3. Nowoczesna baza z subtelnymi magicznymi akcentami w kluczowych interakcjach (hover, otwieranie okien, powiadomienia), nie w każdym elemencie

### Paleta kolorów
- R4. Tło (background): głęboki ciemny z lekkim niebieskim/fioletowym odcieniem
  - `--bg-base`: ~#0F1117 (najgłębsze tło, canvas)
  - `--bg-surface`: ~rgba(255, 255, 255, 0.05) (karty, panele — glassmorphism)
  - `--bg-elevated`: ~rgba(255, 255, 255, 0.08) (modale, dropdowny)
  - `--bg-overlay`: ~rgba(0, 0, 0, 0.6) (backdrop za modalami)
- R5. Kolor akcentowy: blady/stary złoty (~#C9B06B) z wariantami
  - `--accent`: #C9B06B
  - `--accent-hover`: jaśniejszy wariant
  - `--accent-muted`: ~rgba(201, 176, 107, 0.15) — tło pod akcentem
  - `--accent-border`: ~rgba(201, 176, 107, 0.3)
- R6. Tekst:
  - `--text-primary`: ~#E8E6E3 (główny tekst)
  - `--text-secondary`: ~#9CA3AF (drugorzędny)
  - `--text-muted`: ~#6B7280 (trzeciorzędny, placeholdery)
  - `--text-accent`: var(--accent) (linki, podświetlenia)
- R7. Kolory semantyczne:
  - `--success`: zielony (~#4ADE80)
  - `--error`: czerwony (~#F87171)
  - `--warning`: pomarańczowy (~#FBBF24)
  - `--info`: niebieski (~#60A5FA)
- R8. Obramowania: subtelne, ~rgba(255, 255, 255, 0.08), jaśniejsze na hover/focus

### Typografia
- R9. Font body: Exo 2 (Google Fonts) — geometric sans-serif z technicznym klimatem
- R10. Font nagłówków: Michroma (Google Fonts) — uppercase, dashboard/command center feel
- R11. Font monospace: JetBrains Mono lub ui-monospace fallback
- R12. Skala rozmiarów (rem-based):
  - xs: 0.75rem (12px), sm: 0.875rem (14px), base: 1rem (16px)
  - lg: 1.125rem (18px), xl: 1.25rem (20px), 2xl: 1.5rem (24px)
  - 3xl: 1.875rem (30px), 4xl: 2.25rem (36px)
- R13. Wagi: 400 (regular), 500 (medium), 600 (semibold) dla Exo 2; Michroma ma jedną wagę (400) — hierarchia przez rozmiar, letter-spacing i uppercase

### Spacing system
- R14. Skala 4px: 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px)
- R15. CSS custom properties dla powtarzalnych wartości (np. `--space-4: 16px`)

### Glassmorphism
- R16. Surface elementy (karty, panele, tool windows):
  - `background: rgba(255, 255, 255, 0.05)`
  - `backdrop-filter: blur(12px)`
  - `border: 1px solid rgba(255, 255, 255, 0.08)`
  - `border-radius: 12px`
- R17. Elevated elementy (modale, dropdowny) — silniejszy blur i jaśniejsze tło
- R18. Opcjonalny subtelny gradient/glow na kluczowych elementach (np. active tool window border z accent kolorem)

### Komponenty bazowe
- R19. Radix UI jako headless primitives (Dialog, Dropdown, Tooltip, Popover, Select, etc.)
- R20. CSS Modules do stylowania (plik .module.css per komponent)
- R21. Design tokens jako CSS custom properties w globalnym pliku
- R22. Komponenty do zbudowania w ramach design systemu:
  - Button (primary/accent, secondary/ghost, danger, icon-only)
  - Input, Textarea, Select
  - Card (glassmorphism surface)
  - ToolWindow (draggable panel z nagłówkiem, glassmorphism)
  - Modal/Dialog
  - Tooltip
  - Badge / Tag
  - Tabs
  - Toast / Notification

### Animacje i transitions
- R23. Umiarkowane animacje — CSS transitions jako domyślne, keyframe animations dla kluczowych momentów
- R24. Duracje: fast (150ms), normal (250ms), slow (350ms)
- R25. Easing: `cubic-bezier(0.4, 0, 0.2, 1)` jako domyślny
- R26. Animowane interakcje:
  - Hover/focus transitions na przyciskach i kartach
  - Otwarcie/zamknięcie okien i modali (scale + opacity)
  - Toast wjazd/wyjazd
  - Subtelny glow pulse na accent elementach (np. aktywne okno narzędziowe)
- R27. Bez spring physics / bez Framer Motion — CSS wystarczy

## Scope Boundaries

- Nie budujemy pełnego komponent library jak design system npm package — to wewnętrzne tokeny i komponenty projektu
- Nie implementujemy light mode
- Nie dodajemy skomplikowanych animacji (spring, gesture, layout animations)
- Nie używamy Tailwind — CSS Modules + custom properties
- Canvas/mapa to osobny system renderowania, design system dotyczy UI paneli i narzędzi

## Success Criteria

- Wszystkie tokeny (kolory, spacing, typografia, blur) zdefiniowane jako CSS custom properties
- Glassmorphism konsekwentnie zastosowany na surface elementach
- Radix UI zintegrowany dla accessibility i logiki komponentów
- Komponenty bazowe (Button, Input, Card, ToolWindow, Modal) gotowe do użycia
- Aplikacja czytelna i komfortowa podczas wielogodzinnych sesji (kontrast, rozmiary fontów)

## Key Decisions

- **Dark mode only**: Upraszcza theming, naturalne dla sesji RPG (klimat)
- **Radix UI + CSS Modules**: Pełna kontrola nad stylami przy zachowaniu accessibility
- **Exo 2 + Michroma**: Geometric sans-serif body + uppercase tech headingi dają command center feel pasujący do GM panelu kontroli
- **Blady złoty (#C9B06B)**: Subtelny, nie dominuje, dobrze współgra z glassmorphism
- **CSS transitions bez Framer Motion**: Wystarczające dla potrzeb, zero runtime cost

## Dependencies / Assumptions

- Fonty (Exo 2, Michroma) ładowane z Google Fonts lub bundled lokalnie (Electron — lepiej lokalnie)
- Radix UI jako dependency npm

## Outstanding Questions

### Deferred to Planning
- [Affects R16-R18][Technical] Czy backdrop-filter performance jest OK na target platformach? Electron Chromium powinien to obsługiwać, ale warto zweryfikować
- [Affects R22][Technical] Kolejność budowania komponentów — które najpierw?
- [Affects R9-R11][Technical] Fonty bundled lokalnie vs Google Fonts — decyzja przy implementacji

## Next Steps

→ `/ce:plan` for structured implementation planning

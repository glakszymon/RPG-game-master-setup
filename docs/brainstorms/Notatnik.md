### 1. Moduł Edytora Tekstu i Treści Scenariuszowych

- **Warstwowość tekstu (Widok Gracza vs Widok DM):** Możliwość oznaczania bloków tekstu jako "Dla Graczy" (do odczytania/skopiowania) oraz "Dla DM" (notatki mechaniczne, sekrety, instrukcje prowadzenia).
- **Interaktywne tagowanie i powiązania (Side-panel):** Automatyczne wykrywanie lub ręczne linkowanie w tekście potworów z bestiariusza oraz NPC. Wykryte elementy pojawiają się w bocznym panelu obok tekstu.
- **Integracja z systemem walki (Encounter Sets):** Możliwość grupowania powiązanych z tekstem postaci/potworów i automatyczne przenoszenie ich z panelu bocznego sceny bezpośrednio do zarządzania aktywną walką (Encounter).
- **Wyzwalacze dźwiękowe (Audio Triggers):** Osadzane wewnątrz tekstu przyciski "Play", które po kliknięciu przez DM-a natychmiast uruchamiają przypisany dźwięk lub podkład z wbudowanego soundboardu.

### 2. Moduł Grafowej Struktury Przygody (Story Graph)

- **Wizualizacja nieliniowa:** Zastąpienie tradycyjnego, ciągłego tekstu strukturą drzewa/grafu, gdzie węzłami są poszczególne sceny, a krawędziami relacje i przejścia między nimi.
- **Zarządzanie alternatywnymi ścieżkami:** Możliwość rozpisywania wielu wariantów wydarzeń (np. "Jeśli gracze pójdą do jaskini" vs "Jeśli wrócą do miasta") z opcją szybkiego przełączania aktywnej linii fabularnej w trakcie sesji.

### 3. Moduł Dynamicznego Czasu i Kalendarza (Timeline & Calendar)

- **Integracja kalendarza z notatnikiem:** Wpisywanie dat bezpośrednio w tekście przygody (np. "20 maja 2026") automatycznie generuje wydarzenie w kalendarzu świata gry.
- **Zależności przyczynowo-skutkowe (Deadlines):** System warunków czasowych (np. "Jeśli gracze dotrą przed X dniem -> Sklepikarz żyje, w przeciwnym wypadku -> Sklepikarz ginie").
- **Kodowanie wizualne:** Automatyczne oznaczanie statusów tych zależności za pomocą dedykowanych symboli oraz kolorystyki w notatniku (np. zielony/czerwony dla sukcesu/porażki czasowej).

### 4. Moduł Baz Danych (Karty NPC, Potworów i Map)

- **Karty Elementów (Pop-up/Side-card):** Każdy NPC, potwór czy przedmiot posiada indywidualną kartę ze statystykami i opisem, dostępną z poziomu tekstu (kliknięcie/najazd myszką), aby nie zaśmiecać głównego nurtu opowieści.
- **Interaktywny Manager Map:** Możliwość przypisywania map do konkretnych scen. Mapy przechowują informacje o rozstawieniu potworów i NPC w przestrzeni (tokeny zapisane na konkretnych pozycjach).

### 5. !!! Moduł Makr i Automatyzacji (One-Click Orchestrator) !!!

- **Przyciski Akcji (Super-Triggers):** Możliwość tworzenia w notatniku przycisków, które za jednym kliknięciem wykonują sekwencję działań:
  - Zmiana aktywnej mapy na ekranie.
  - Automatyczne rozstawienie zapisanych tokenów potworów/NPC na nowych pozycjach.
  - Zmiana muzyki w tle (soundtrack) oraz odpalenie efektu dźwiękowego otoczenia (ambient).
  - Uruchomienie efektów wizualnych (np. zmiana oświetlenia mapy, mgła wojny).



# Struktura 

┌────────────────────────────────┬──────────────────────────────┬─────────────────────┐
│ Graph     │ List    │          │                              │                     │
├───────────┴─────────┴──────────┼ STREFA DO PISANIA SWOBODNEGO │                     │
│  ┌─────────────────┐           │                              │                     │
│  │  Tekst 1        ├────┐      │                              │     Lista           │
│  └─────┬───────────┘    │      │                              │     - postaci       │
│        │                │      │                              │     - potworów      │
│        │                │      │                              │     - map           │
│        │                │      │                              │     - muzyki        │
│        │                │      │                              │                     │
│        │                │      │                              │                     │
│        │                │      │                              │     z danego        │
│  ┌─────▼──────┐         │      │                              │        notesu       │
│  │ Tekst 2    │         │      │                              │       pojedynczego  │
│  └─┬──────────┘         │      │                              │       dokumentu     │
│    │                    │      │                              │                     │
│    │            ┌───────▼─────┐│                              │                     │
│    │            │  tekst 3    ││                              │                     │
│    │            └────┬──┬─────┘│                              │                     │
│    │                 │  │      │                              │                     │
│    │                 │  │      │                              │                     │
│ ┌──▼──────────┐      │  │      │                              │                     │
│ │ Tekst 4     ◄──────┘  │      │                              │                     │
│ └─────────┬───┘         │      │                              │                     │
│           │             │      │                              │                     │
│           │             │      │                              │                     │
│           │             │      │                              │                     │
│           │             │      │                              │                     │
│          ┌▼─────────────▼───┐  │                              │                     │
│          │  Tekst 5         │  │                              │                     │
│          └──────────────────┘  │                              │                     │
└────────────────────────────────┴──────────────────────────────┴─────────────────────┘



## Grafy 

- powstaje poprzez odwołanie sie w tekście do innego pliku np. "/tekst2" tworzy polaczenie miedzy akltywnym a tekstem 2
- Za ich podstawą tworzy sie bieg opowiadania 
- **Wizualizacja nieliniowa:** Zastąpienie tradycyjnego, ciągłego tekstu strukturą drzewa/grafu, gdzie węzłami są poszczególne sceny, a krawędziami relacje i przejścia między nimi.

## Potwory i postacie 

- W tekście można odwołać sie do postaci / potwora poprzez @kot. To automatycznie dodaje na panelu po prawej postać jaka istnieje w bibliotece albo w danej kampanii 
- W sekcji po prawej ma sie znajdować przycisk służący do automatycznego stworzenia grupy postaci w oknie "Encounter Sets" w grupie o nazwie podawanej przez użytkownika albo wykorzystując nazwę pliku notatnikowego 

## Mapy

- dodanie mapy do notatika ma być albo z mapą z biblioteki albo z mapą z pliku. Po dodaniu pojawia sie klasyczna odpcja załaczenia pliku. Nastepnie ma być możliwość ustawienia mapy jednym kliknięciem 

## UWAGA 

- mapy i potwory muszą mieć funkcje ustawienia ich pozycji w czasie planowania i zapisania tych informacji w notatniku w odpowiednim miejscu i w czasie ostetcznej gry jednym przyciskiem mają sie aktualizować i mapa i potwory na tej mapie. 
- ta funkcjonalność jeszcze nie wymyśliłem jak ją stworzyć ale jest bardzo istotna aby dało sie planować wszystkie sceny przed sama rozgrywką i uruchamiać jednym przyciskiem 

## Muzyka 

Dodawanie muzyki działać ma identycznie jak korzystanie z funkcji mapy 

## Czas i kalendarz 

- użytkownik może mieć możliwośc dodania daty / czasu jakiegoś wydarzenia w notatniku. W notatniku wtedy uzupełnia wszystkie potzrbne dane i dane wydarzenia ma sie pojawić w kalendarzu w odpowiednim dniu ewentualnie w odpowiedniej godzinie 




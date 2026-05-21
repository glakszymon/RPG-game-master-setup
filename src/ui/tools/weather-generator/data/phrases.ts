/*
 * Weather Generator — phrase pool (Polish)
 *
 * Each entry has conditions that must match current params,
 * multiple narrative variants, and mechanical effects.
 */

import type { PhraseEntry } from '../types';

export const PHRASES: PhraseEntry[] = [
  /* ── Temperature extremes ── */
  {
    conditions: { temperature: [-40, -15] },
    narrative: [
      'Mroźne powietrze gryzie w odsłonięte fragmenty skóry. Oddech zamienia się w białą parę, a każdy krok na zamarzniętej ziemi wydaje chrupanie.',
      'Przenikliwe zimno przenika przez każdą warstwę odzieży. Metalowe przedmioty są niebezpiecznie zimne w dotyku.',
      'Arktyczny mróz ściska wszystko w lodowym uścisku. Woda w butelkach dawno zamarzła.',
    ],
    mechanical: [
      { category: 'hazard', icon: '⚠️', label: 'Odmrożenia po 30min', description: 'Bez odpowiedniego ekwipunku zimowego odsłonięta skóra odmraża się po 30 minutach ekspozycji.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -50%', description: 'Zaspy śnieżne i zamarznięta ziemia drastycznie spowalniają marsz.' },
      { category: 'resources', icon: '🔥', label: 'Opał: x3', description: 'Utrzymanie ciepła wymaga znacznie więcej paliwa.' },
    ],
  },
  {
    conditions: { temperature: [-15, 0] },
    narrative: [
      'Chłód jest dotkliwy, ale znośny. Oddech skrapla się w powietrzu, a zamarznięte kałuże trzeszczą pod butami.',
      'Zimno przeszywa do kości. Palce sztywnieją w rękawicach, a nos i uszy czerwienieją od mrozu.',
      'Mroźne powietrze szczypie w policzki. Ziemia jest twarda jak kamień.',
    ],
    mechanical: [
      { category: 'hazard', icon: '⚠️', label: 'Ryzyko wychłodzenia', description: 'Dłuższy postój bez ogrzania grozi wychłodzeniem organizmu.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -25%', description: 'Zamarznięta lub oblodzona nawierzchnia spowalnia podróżnych.' },
    ],
  },
  {
    conditions: { temperature: [35, 50] },
    narrative: [
      'Upał jest nie do zniesienia. Powietrze drży nad rozgrzaną ziemią, a pot natychmiast paruje ze skóry.',
      'Słońce praży bezlitośnie. Kamienie i metal są tak gorące, że można się poparzyć.',
      'Gorąco owija się wokół jak ciężki koc. Każdy ruch wymaga dodatkowego wysiłku.',
    ],
    mechanical: [
      { category: 'hazard', icon: '⚠️', label: 'Udar cieplny po 2h', description: 'Bez odpowiedniego nawodnienia i osłony, ryzyko udaru cieplnego po 2 godzinach ekspozycji.' },
      { category: 'resources', icon: '💧', label: 'Woda: x2', description: 'Intensywne pocenie wymaga podwójnej ilości wody pitnej.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -30%', description: 'Upał wymusza częstsze odpoczynki i wolniejsze tempo marszu.' },
    ],
  },

  /* ── Pleasant weather ── */
  {
    conditions: { temperature: [15, 25], cloud: ['clear', 'lightClouds'], wind: ['calm', 'light'] },
    narrative: [
      'Pogoda sprzyja podróży. Łagodne powietrze i przyjemna temperatura zachęcają do dalszej drogi.',
      'Idealne warunki do marszu. Lekki wiaterek przynosi ulgę, a słońce grzeje przyjemnie.',
      'Cudowny dzień na podróż. Niebo jest czyste, temperatura komfortowa, a powietrze rześkie.',
    ],
    mechanical: [],
  },

  /* ── Wind effects ── */
  {
    conditions: { wind: ['strong', 'storm'] },
    narrative: [
      'Silny wiatr wyje między skałami i drzewami, szarpiąc za płaszcze i utrudniając rozmowę.',
      'Porywisty wicher pcha podróżnych na boki. Latające gałęzie i piasek utrudniają marsz.',
      'Huragan szaleje z nieokiełznaną siłą. Stanie w miejscu wymaga wysiłku.',
    ],
    mechanical: [
      { category: 'travel', icon: '🚶', label: 'Podróż: -20%', description: 'Silny wiatr czołowy znacząco spowalnia marsz i utrudnia orientację.' },
      { category: 'visibility', icon: '👁️', label: 'Widoczność: zmniejszona', description: 'Unoszony piasek, liście i kurz ograniczają pole widzenia.' },
    ],
  },

  /* ── Precipitation effects ── */
  {
    conditions: { precipitation: ['rain'] },
    narrative: [
      'Deszcz pada miarowo, zamieniając ścieżki w błotniste potoki. Krople bębnią o hełmy i naramienniki.',
      'Monotonny deszcz przemacza ubrania i obniża morale. Świat wygląda szaro i ponuro.',
      'Ciepły deszcz spowija okolicę wilgotną zasłoną. Ziemia chlupocze pod stopami.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: ~100m', description: 'Deszcz ogranicza widoczność do około 100 metrów.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -15%', description: 'Błotniste drogi i śliska nawierzchnia spowalniają podróż.' },
    ],
  },
  {
    conditions: { precipitation: ['heavyRain'] },
    narrative: [
      'Ulewa spada ścianą wody. Strumienie zamieniają się w rwące potoki, a drogi w rozlewiska.',
      'Ściana deszczu ogranicza widoczność do kilkunastu metrów. Huk grzmotów zagłusza rozmowy.',
      'Potężna ulewa zalewa wszystko wokół. Woda sięga kostek nawet na wyższych terenach.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: ~20m', description: 'Ulewa drastycznie ogranicza widoczność.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -40%', description: 'Zalane drogi i rwące strumienie czynią podróż niezwykle trudną.' },
      { category: 'hazard', icon: '⚠️', label: 'Powódź błyskawiczna', description: 'Ryzyko nagłego wezbrania wód w niższych partiach terenu.' },
    ],
  },
  {
    conditions: { precipitation: ['snow'] },
    narrative: [
      'Śnieg pada gęstymi płatkami, pokrywając krajobraz białym całunem. Świat cichnie pod śnieżną pierzyną.',
      'Białe płatki wirują w powietrzu, zasypując ślady i drogi. Cicho, spokojnie, zimno.',
      'Śnieżyca otula okolicę. Każdy krok zostawia głębokie ślady w świeżym puchu.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: ~50m', description: 'Padający śnieg ogranicza widoczność.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -30%', description: 'Warstwa śniegu utrudnia marsz, szczególnie poza utartymi szlakami.' },
    ],
  },
  {
    conditions: { precipitation: ['fog'] },
    narrative: [
      'Gęsta mgła spowija okolicę, zamazując kontury drzew i budynków. Dźwięki wydają się stłumione i odległe.',
      'Mleczna mgła ogranicza widoczność do kilku kroków. Świat kurczy się do niewielkiego kręgu wokół podróżnych.',
      'Mgła wije się między drzewami jak żywa istota. Nie widać dalej niż na wyciągnięcie ręki.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: ~10-30m', description: 'Gęsta mgła drastycznie ogranicza pole widzenia.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -20%', description: 'Brak orientacji i niebezpieczeństwo zboczenia ze szlaku.' },
      { category: 'hazard', icon: '⚠️', label: 'Ryzyko zabłądzenia', description: 'Bez kompasu lub mapy łatwo stracić orientację we mgle.' },
    ],
  },
  {
    conditions: { precipitation: ['hail'] },
    narrative: [
      'Grad bębni o ziemię i zbroje z ogłuszającą siłą. Lodowe kulki wielkości grochu spadają z nieba.',
      'Lodowe pociski spadają z nieba, zmuszając podróżnych do szukania schronienia.',
    ],
    mechanical: [
      { category: 'hazard', icon: '⚠️', label: 'Obrażenia od gradu', description: 'Bez osłony grad może powodować siniaki i drobne obrażenia.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: zatrzymana', description: 'Marsz w gradzie jest niebezpieczny — konieczne schronienie.' },
    ],
  },

  /* ── Humidity ── */
  {
    conditions: { humidity: [80, 100], temperature: [25, 50] },
    narrative: [
      'Wilgotne, ciężkie powietrze utrudnia oddychanie. Pot nie paruje, a ubrania leją się od wilgoci.',
      'Duszne powietrze przylega do skóry jak mokry ręcznik. Każdy ruch kosztuje podwójny wysiłek.',
    ],
    mechanical: [
      { category: 'resources', icon: '💧', label: 'Woda: x1.5', description: 'Wysokie temperatury przy dużej wilgotności zwiększają zapotrzebowanie na wodę.' },
      { category: 'travel', icon: '🚶', label: 'Podróż: -15%', description: 'Duszne powietrze szybciej męczy podróżnych.' },
    ],
  },

  /* ── Night time ── */
  {
    conditions: { timeOfDay: ['night'], cloud: ['fullOvercast'] },
    narrative: [
      'Noc jest całkowicie czarna. Grube chmury przesłaniają gwiazdy i księżyc, pogrążając świat w ciemności.',
      'Nieprzenikniona ciemność otacza podróżnych. Bez pochodni nie widać nawet własnej dłoni.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: ~5m (bez światła)', description: 'Bez źródła światła widoczność jest praktycznie zerowa.' },
    ],
  },
  {
    conditions: { timeOfDay: ['night'], cloud: ['clear'] },
    narrative: [
      'Księżyc i gwiazdy rozświetlają krajobraz srebrzystym blaskiem. Cienie są długie i ostre.',
      'Bezchmurna noc pozwala księżycowi oświetlić drogę. Gwiazdy migoczą tysiącami na firmamencie.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: ~30m (światło księżyca)', description: 'Światło księżyca pozwala na podstawową orientację bez pochodni.' },
    ],
  },

  /* ── Underground specific ── */
  {
    conditions: { airFlow: ['still'] },
    narrative: [
      'Powietrze jest nieruchome i stęchłe. Każdy dźwięk odbija się echem od wilgotnych ścian.',
      'Martwa cisza panuje w tunelach. Powietrze jest gęste i pachnie wilgocią oraz kamieniem.',
    ],
    mechanical: [],
  },
  {
    conditions: { airFlow: ['strongDraft'] },
    narrative: [
      'Silny przeciąg hula tunelami, gasząc pochodnie i szeleszcząc w ciemności.',
      'Potężny podmuch powietrza przelatuje przez korytarz — gdzieś musi być duże otwarcie.',
    ],
    mechanical: [
      { category: 'hazard', icon: '⚠️', label: 'Gasnące pochodnie', description: 'Silny przeciąg może gasić otwarte źródła ognia.' },
    ],
  },
  {
    conditions: { humidity: [85, 100], airFlow: ['still', 'lightDraft'] },
    narrative: [
      'Ściany lśnią od wilgoci. Krople spadają z sufitu w monotonnym rytmie.',
      'Wilgoć osiada na wszystkim — włosach, ubraniach, broni. Metal rdzewieje w oczach.',
    ],
    mechanical: [
      { category: 'hazard', icon: '⚠️', label: 'Śliska nawierzchnia', description: 'Mokre, pokryte mchem kamienie zwiększają ryzyko upadku.' },
    ],
  },

  /* ── Dawn/Dusk atmosphere ── */
  {
    conditions: { timeOfDay: ['dawn'] },
    narrative: [
      'Pierwsze promienie słońca malują niebo odcieniami pomarańczu i różu. Poranna rosa lśni na trawie.',
      'Świt budzi okolicę do życia. Ptaki zaczynają śpiewać, a mgła poranna powoli się unosi.',
    ],
    mechanical: [],
  },
  {
    conditions: { timeOfDay: ['dusk'] },
    narrative: [
      'Słońce chyli się ku horyzontowi, barwiąc chmury na purpurowo. Cienie wydłużają się dramatycznie.',
      'Zmierzch zapada szybko. Ostatnie promienie dnia przebijają się między drzewami.',
    ],
    mechanical: [
      { category: 'visibility', icon: '👁️', label: 'Widoczność: malejąca', description: 'Gasnące światło dzienne ogranicza widoczność — wkrótce będzie potrzebne oświetlenie.' },
    ],
  },
];

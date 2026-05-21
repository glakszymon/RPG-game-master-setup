/*
 * Generator data — bundled name lists, roles, descriptions, and age ranges.
 */

import type { NameListCategory } from '../types';

export const DEFAULT_NAME_LISTS: NameListCategory[] = [
  {
    id: 'fantasy',
    label: 'Fantasy',
    names: {
      male: [
        'Aldric', 'Borin', 'Cedric', 'Dorian', 'Eldric', 'Faelan', 'Gareth', 'Hadrian',
        'Ivor', 'Jareth', 'Kael', 'Lorin', 'Merrick', 'Nolan', 'Orin', 'Perrin',
        'Quillon', 'Rowan', 'Silas', 'Theron', 'Ulric', 'Varen', 'Wren', 'Xander',
      ],
      female: [
        'Aria', 'Brielle', 'Celeste', 'Daria', 'Elara', 'Freya', 'Gwendolyn', 'Helena',
        'Isolde', 'Juniper', 'Kira', 'Lyra', 'Mirena', 'Nadia', 'Ophelia', 'Petra',
        'Quinn', 'Rosalind', 'Seraphina', 'Thea', 'Una', 'Viola', 'Willow', 'Yara',
      ],
      neutral: [
        'Ash', 'Brook', 'Cypress', 'Dusk', 'Ember', 'Finch', 'Glen', 'Hazel',
        'Indigo', 'Jade', 'Kit', 'Lark', 'Moss', 'Noon', 'Oak', 'Pike',
        'Rain', 'Sage', 'Thorn', 'Vale', 'Wynn', 'Zephyr',
      ],
    },
  },
  {
    id: 'slavic',
    label: 'Slavic',
    names: {
      male: [
        'Borys', 'Czesław', 'Dobrogost', 'Gromosław', 'Jarosław', 'Kazimierz',
        'Lech', 'Mirosław', 'Radosław', 'Sławomir', 'Tomisław', 'Władysław',
        'Zbigniew', 'Ziemowit', 'Bogdan', 'Mieszko', 'Światopełk', 'Wrocisław',
        'Drogomił', 'Gniewko', 'Bożydar', 'Strzeżymir', 'Racibor', 'Sobiesław',
      ],
      female: [
        'Bogna', 'Czesława', 'Dobrosława', 'Grażyna', 'Jadwiga', 'Kazimiera',
        'Ludmiła', 'Mirosława', 'Radosława', 'Sławomira', 'Wanda', 'Żywia',
        'Bożena', 'Halszka', 'Jagna', 'Małgorzata', 'Świętosława', 'Rogneda',
        'Dobrawa', 'Bronisława', 'Dzierżysława', 'Milena', 'Wisława', 'Zbyslawa',
      ],
      neutral: [
        'Zorza', 'Jesień', 'Burza', 'Wicher', 'Topór', 'Łuna', 'Mrok', 'Szron',
      ],
    },
  },
  {
    id: 'medieval',
    label: 'Medieval',
    names: {
      male: [
        'William', 'Robert', 'Richard', 'Henry', 'Edward', 'Thomas', 'John', 'Hugh',
        'Walter', 'Roger', 'Geoffrey', 'Ralph', 'Simon', 'Gilbert', 'Alan', 'Stephen',
      ],
      female: [
        'Alice', 'Matilda', 'Eleanor', 'Agnes', 'Margaret', 'Joan', 'Isabel', 'Cecilia',
        'Emma', 'Beatrice', 'Avice', 'Maud', 'Edith', 'Constance', 'Lettice', 'Sybil',
      ],
      neutral: [],
    },
  },
];

export const ROLES: string[] = [
  'Merchant', 'Innkeeper', 'Guard', 'Farmer', 'Blacksmith', 'Healer', 'Scholar',
  'Thief', 'Noble', 'Priest', 'Hunter', 'Sailor', 'Bard', 'Beggar', 'Alchemist',
  'Courier', 'Herbalist', 'Librarian', 'Mason', 'Miller', 'Shepherd', 'Tanner',
  'Weaver', 'Woodcutter', 'Apothecary', 'Captain', 'Diplomat', 'Explorer',
  'Fortune Teller', 'Guide', 'Hermit', 'Judge', 'Knight', 'Mercenary',
];

export const DESCRIPTIONS: string[] = [
  'Tall and gaunt with piercing eyes',
  'Short and stocky with a booming laugh',
  'Scarred face, speaks softly',
  'Well-dressed, nervous mannerisms',
  'Weather-worn features, calloused hands',
  'Elegant bearing, sharp tongue',
  'Missing a finger, wears many rings',
  'Wild hair, ink-stained fingers',
  'Heavy-set, jovial expression',
  'Lean and wiry, always moving',
  'One milky eye, warm smile',
  'Braided hair, foreign accent',
  'Freckled, smells of herbs',
  'Pale skin, dark circles under eyes',
  'Muscular build, gentle voice',
  'Hunched posture, quick wit',
  'Rosy cheeks, flour-dusted clothes',
  'Tattoed arms, easy grin',
  'Gray-streaked hair, thoughtful gaze',
  'Limp in the left leg, proud bearing',
];

export const AGE_RANGES = {
  min: 16,
  max: 75,
};

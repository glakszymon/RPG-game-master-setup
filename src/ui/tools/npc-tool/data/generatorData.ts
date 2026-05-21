/*
 * Generator data — bundled name lists, races, professions, personalities, appearances, and age ranges.
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

export const RACES: string[] = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Half-Elf', 'Half-Orc', 'Gnome',
  'Tiefling', 'Dragonborn', 'Orc', 'Goblin', 'Lizardfolk', 'Firbolg',
  'Tabaxi', 'Kenku', 'Aarakocra', 'Genasi', 'Changeling', 'Warforged',
];

export const PROFESSIONS: string[] = [
  'Merchant', 'Innkeeper', 'Guard', 'Farmer', 'Blacksmith', 'Healer', 'Scholar',
  'Thief', 'Noble', 'Priest', 'Hunter', 'Sailor', 'Bard', 'Beggar', 'Alchemist',
  'Courier', 'Herbalist', 'Librarian', 'Mason', 'Miller', 'Shepherd', 'Tanner',
  'Weaver', 'Woodcutter', 'Apothecary', 'Captain', 'Diplomat', 'Explorer',
  'Fortune Teller', 'Guide', 'Hermit', 'Judge', 'Knight', 'Mercenary',
  'Spy', 'Assassin', 'Enchanter', 'Brewer', 'Baker', 'Fisherman',
  'Cartographer', 'Miner', 'Scribe', 'Stable Master', 'Gravedigger',
  'Bounty Hunter', 'Smuggler', 'Street Performer', 'Tax Collector',
];

export const PERSONALITIES: string[] = [
  'Cheerful and optimistic, always looking on the bright side',
  'Grumpy and suspicious of strangers',
  'Quiet and observant, speaks only when necessary',
  'Boisterous and loud, loves telling stories',
  'Nervous and fidgety, always looking over their shoulder',
  'Calm and collected, rarely shows emotion',
  'Sarcastic and witty, always has a quip ready',
  'Kind-hearted but naive, trusts too easily',
  'Ambitious and scheming, always planning ahead',
  'Melancholic and brooding, haunted by the past',
  'Curious and inquisitive, asks too many questions',
  'Stubborn and proud, never admits being wrong',
  'Generous to a fault, gives away what little they have',
  'Cowardly but clever, avoids danger at all costs',
  'Fiercely loyal to friends, ruthless to enemies',
  'Absent-minded and scatterbrained, easily distracted',
  'Devoutly religious, sees signs in everything',
  'Pragmatic and blunt, has no patience for pleasantries',
  'Flirtatious and charming, hard to pin down',
  'Paranoid and distrustful, keeps secrets close',
  'Philosophical and contemplative, ponders everything',
  'Hot-tempered, quick to anger but quick to forgive',
  'Patient and methodical, never rushes anything',
  'Eccentric and unpredictable, follows their own logic',
];

export const APPEARANCES: string[] = [
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
  'Tattooed arms, easy grin',
  'Gray-streaked hair, thoughtful gaze',
  'Limp in the left leg, proud bearing',
  'Bald head, impressive beard',
  'Unusually tall, stoops through doorways',
  'Delicate features, surprisingly strong grip',
  'Burn scars on hands, calm demeanor',
  'Crooked nose, infectious smile',
  'Heterochromatic eyes, silver jewelry',
  'Sun-darkened skin, white hair',
  'Covered in dirt, smells of earth',
  'Immaculately clean, pressed clothes',
  'Wiry frame, moves like a cat',
];

export const AGE_RANGES = {
  min: 16,
  max: 75,
};

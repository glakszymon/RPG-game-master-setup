/*
 * CR Utilities — XP and Proficiency Bonus lookup from Challenge Rating.
 * Based on D&D 2024 Monster Manual tables.
 */

/** CR → XP mapping (Monster Manual 2024) */
const CR_XP_TABLE: Record<string, number> = {
  '0': 0,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
};

/** Parse CR string to numeric value */
export function parseCr(cr: string): number {
  const trimmed = cr.trim();
  if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/');
    return Number(num) / Number(den);
  }
  return Number(trimmed) || 0;
}

/** Get XP for a given CR string. Returns null if CR is unrecognized. */
export function getXpFromCr(cr: string | null | undefined): number | null {
  if (!cr) return null;
  const trimmed = cr.trim();
  return CR_XP_TABLE[trimmed] ?? null;
}

/** Get Proficiency Bonus for a given CR string. */
export function getProficiencyBonus(cr: string | null | undefined): number {
  if (!cr) return 2;
  const numeric = parseCr(cr);
  if (numeric < 5) return 2;
  if (numeric < 9) return 3;
  if (numeric < 13) return 4;
  if (numeric < 17) return 5;
  if (numeric < 21) return 6;
  if (numeric < 25) return 7;
  if (numeric < 29) return 8;
  return 9;
}

/** Format XP with thousands separator */
export function formatXp(xp: number): string {
  return xp.toLocaleString('en-US');
}

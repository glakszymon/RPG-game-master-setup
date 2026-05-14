/*
 * Party Tracker — data types
 */

/** Available field types for card editor */
export type FieldType = 'number' | 'bubbles' | 'text-field' | 'text-box' | 'radio' | 'checkbox';

/** Field width in the card layout (auto-flow: fields ≤ 1 total width share a row) */
export type FieldWidth = '1/3' | '1/2' | '2/3' | 'full';

/** Alignment */
export type Alignment = 'left' | 'center' | 'right';

/** Card size preset */
export type CardSizePreset = 'S' | 'M' | 'L';

/** Type-specific settings for a field */
export interface NumberFieldSettings {
  sliderEnabled: boolean;
  min?: number;
  max?: number;
}

export interface BubblesFieldSettings {
  count: number; // total number of bubbles
}

export interface RadioFieldSettings {
  options: string[]; // list of option labels
}

/** A field definition (part of card structure, shared across all characters) */
export interface FieldDefinition {
  id: string;
  type: FieldType;
  title: string;
  width: FieldWidth;
  textAlign: Alignment;
  positionAlign: Alignment; // position within row
  // Type-specific settings
  settings?: NumberFieldSettings | BubblesFieldSettings | RadioFieldSettings;
}

/** The card structure — shared for all characters in a campaign */
export interface CardStructure {
  fields: FieldDefinition[];
}

/** A single character in the party */
export interface Character {
  id: string;
  name: string;
  portraitPath: string | null;
  /** Field values keyed by field definition ID */
  fieldValues: Record<string, FieldValue>;
  order: number;
}

/** Possible field values */
export type FieldValue =
  | { type: 'number'; value: number }
  | { type: 'bubbles'; filled: number } // how many are filled (out of settings.count)
  | { type: 'text-field'; value: string }
  | { type: 'text-box'; value: string }
  | { type: 'radio'; selected: string }
  | { type: 'checkbox'; checked: boolean };

/** Party Tracker tool state (stored in WindowState.toolState) */
export interface PartyTrackerState {
  cardSize: CardSizePreset;
  characters: Character[];
  cardStructure: CardStructure;
}

/** Default card structure for new campaigns */
export const DEFAULT_CARD_STRUCTURE: CardStructure = {
  fields: [
    {
      id: 'hp',
      type: 'number',
      title: 'HP',
      width: '1/3',
      textAlign: 'center',
      positionAlign: 'left',
      settings: { sliderEnabled: false } as NumberFieldSettings,
    },
    {
      id: 'armor',
      type: 'number',
      title: 'Armor',
      width: '1/3',
      textAlign: 'center',
      positionAlign: 'center',
      settings: { sliderEnabled: false } as NumberFieldSettings,
    },
    {
      id: 'initiative',
      type: 'number',
      title: 'Initiative',
      width: '1/3',
      textAlign: 'center',
      positionAlign: 'right',
      settings: { sliderEnabled: false } as NumberFieldSettings,
    },
  ],
};

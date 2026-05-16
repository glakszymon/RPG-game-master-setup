/*
 * Party Tracker — data types
 *
 * Re-exports shared field types and defines party-tracker-specific types.
 */

export type {
  FieldType,
  FieldWidth,
  Alignment,
  FieldDefinition,
  FieldValue,
  FieldSettings,
  NumberFieldSettings,
  BubblesFieldSettings,
  RadioFieldSettings,
} from '../../components/dynamic-fields';

/** Card size preset */
export type CardSizePreset = 'S' | 'M' | 'L';

/** The card structure — shared for all characters in a campaign */
export interface CardStructure {
  fields: import('../../components/dynamic-fields').FieldDefinition[];
}

/** A single character in the party */
export interface Character {
  id: string;
  name: string;
  portraitPath: string | null;
  /** Field values keyed by field definition ID */
  fieldValues: Record<string, import('../../components/dynamic-fields').FieldValue>;
  order: number;
}

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
      positionAlign: 'center',
      sortOrder: 0,
      settings: { sliderEnabled: false },
    },
    {
      id: 'armor',
      type: 'number',
      title: 'Armor',
      width: '1/3',
      textAlign: 'center',
      positionAlign: 'center',
      sortOrder: 1,
      settings: { sliderEnabled: false },
    },
    {
      id: 'initiative',
      type: 'number',
      title: 'Initiative',
      width: '1/3',
      textAlign: 'center',
      positionAlign: 'center',
      sortOrder: 2,
      settings: { sliderEnabled: false },
    },
  ],
};

/*
 * NPC Tool — data types for Library + Generator
 */

/** A single NPC in the campaign library */
export interface Npc {
  id: string;
  campaignId: string;
  name: string;
  typeRole: string;
  tags: string[];
  description: string;
  notes: string;
  portraitPath: string | null;
  portraitBuiltin: string | null;
  fieldValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/** Custom field definition scoped to a campaign */
export interface NpcCustomFieldDef {
  id: string;
  campaignId: string;
  fieldName: string;
  fieldType: 'text' | 'number';
  sortOrder: number;
}

/** Name list category for the generator */
export interface NameListCategory {
  id: string;
  label: string;
  names: { male: string[]; female: string[]; neutral: string[] };
}

/** Generator output before saving */
export interface GeneratedNpc {
  name: string;
  role: string;
  description: string;
  age: number;
  gender: 'male' | 'female' | 'neutral';
}

/** Active tab in the NPC tool window */
export type NpcToolTab = 'library' | 'generator';

/** Tool state stored in WindowState.toolState */
export interface NpcToolState {
  activeTab: NpcToolTab;
  searchQuery: string;
  selectedTags: string[];
  selectedNpcId: string | null;
  generatorNameType: string;
  generatorGender: 'male' | 'female' | 'neutral';
  lastGenerated: GeneratedNpc | null;
}

export const DEFAULT_NPC_TOOL_STATE: NpcToolState = {
  activeTab: 'library',
  searchQuery: '',
  selectedTags: [],
  selectedNpcId: null,
  generatorNameType: 'fantasy',
  generatorGender: 'neutral',
  lastGenerated: null,
};

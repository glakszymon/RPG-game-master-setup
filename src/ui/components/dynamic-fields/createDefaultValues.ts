/*
 * Dynamic Fields — create default field values for a given structure.
 */

import type { FieldDefinition, FieldValue, RadioFieldSettings } from './types';

/** Generate empty/default field values for all fields in a structure */
export function createDefaultFieldValues(fields: FieldDefinition[]): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'number':
        values[field.id] = { type: 'number', value: 0 };
        break;
      case 'bubbles':
        values[field.id] = { type: 'bubbles', filled: 0 };
        break;
      case 'text-field':
        values[field.id] = { type: 'text-field', value: '' };
        break;
      case 'text-box':
        values[field.id] = { type: 'text-box', value: '' };
        break;
      case 'radio': {
        const opts = (field.settings as RadioFieldSettings)?.options ?? [];
        values[field.id] = { type: 'radio', selected: opts[0] ?? '' };
        break;
      }
      case 'checkbox':
        values[field.id] = { type: 'checkbox', checked: false };
        break;
      case 'action-list':
        values[field.id] = { type: 'action-list', actions: [] };
        break;
      case 'tag-list':
        values[field.id] = { type: 'tag-list', tags: [] };
        break;
      case 'stat-block':
        values[field.id] = {
          type: 'stat-block',
          scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          saves: {},
        };
        break;
    }
  }
  return values;
}

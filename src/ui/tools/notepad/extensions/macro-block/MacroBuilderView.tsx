/*
 * MacroBuilderView — React NodeView component for the macro block.
 *
 * Displays a list of macro steps with add/remove/reorder and an "Execute" button.
 */

import { useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { MacroStep } from './MacroBlock';
import styles from './MacroBuilder.module.css';

const STEP_TYPES: { type: MacroStep['type']; label: string }[] = [
  { type: 'load-map-preset', label: 'Load Map Preset' },
  { type: 'play-music', label: 'Play Music' },
  { type: 'stop-music', label: 'Stop Music' },
  { type: 'wait', label: 'Wait (ms)' },
];

export function MacroBuilderView({ node, updateAttributes }: NodeViewProps) {
  const [steps, setSteps] = useState<MacroStep[]>(() => {
    try {
      return JSON.parse(node.attrs.steps as string) as MacroStep[];
    } catch {
      return [];
    }
  });

  const commitSteps = useCallback((newSteps: MacroStep[]) => {
    setSteps(newSteps);
    updateAttributes({ steps: JSON.stringify(newSteps) });
  }, [updateAttributes]);

  const addStep = useCallback((type: MacroStep['type']) => {
    const step: MacroStep = {
      id: crypto.randomUUID(),
      type,
      label: STEP_TYPES.find(s => s.type === type)?.label ?? type,
      payload: type === 'wait' ? '1000' : '',
    };
    commitSteps([...steps, step]);
  }, [steps, commitSteps]);

  const removeStep = useCallback((id: string) => {
    commitSteps(steps.filter(s => s.id !== id));
  }, [steps, commitSteps]);

  const updateStepPayload = useCallback((id: string, payload: string) => {
    commitSteps(steps.map(s => s.id === id ? { ...s, payload } : s));
  }, [steps, commitSteps]);

  const handleExecute = useCallback(() => {
    // Dispatch custom event for the macro executor hook to pick up
    window.dispatchEvent(new CustomEvent('notepad:execute-macro', {
      detail: { steps },
    }));
  }, [steps]);

  return (
    <NodeViewWrapper className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>Macro</span>
        <button className={styles.executeBtn} onClick={handleExecute} type="button">
          ▶ Execute
        </button>
      </div>

      <div className={styles.stepList}>
        {steps.map(step => (
          <div key={step.id} className={styles.step}>
            <span className={styles.stepType}>{step.label}</span>
            {(step.type === 'wait' || step.type === 'load-map-preset' || step.type === 'play-music') && (
              <input
                className={styles.stepInput}
                type="text"
                value={step.payload}
                onChange={e => updateStepPayload(step.id, e.target.value)}
                placeholder={step.type === 'wait' ? 'ms' : 'ID'}
              />
            )}
            <button className={styles.removeBtn} onClick={() => removeStep(step.id)} type="button">
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className={styles.addBar}>
        {STEP_TYPES.map(st => (
          <button
            key={st.type}
            className={styles.addBtn}
            onClick={() => addStep(st.type)}
            type="button"
          >
            + {st.label}
          </button>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

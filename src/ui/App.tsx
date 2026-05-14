import { useState, useCallback } from 'react';
import { InfiniteCanvas } from './canvas';
import { Hub } from './views/Hub';
import transitionStyles from './views/ViewTransition.module.css';

type AppView =
  | { kind: 'hub' }
  | { kind: 'canvas'; campaignId: string }
  | { kind: 'mapCreator' };

/**
 * App — main application entry point with view routing.
 *
 * Routes between Hub (campaign selection), Canvas (campaign session),
 * and Map Creator. Applies CSS transition animations on view change.
 */
function App() {
  const [view, setView] = useState<AppView>({ kind: 'hub' });
  const [transitionClass, setTransitionClass] = useState('');

  const openCampaign = useCallback((campaignId: string) => {
    setTransitionClass(transitionStyles.zoomEnter);
    setView({ kind: 'canvas', campaignId });
  }, []);

  const openMapCreator = useCallback(() => {
    setTransitionClass(transitionStyles.slideEnter);
    setView({ kind: 'mapCreator' });
  }, []);

  const goToHub = useCallback(() => {
    setTransitionClass(transitionStyles.fadeEnter);
    setView({ kind: 'hub' });
  }, []);

  const handleAnimationEnd = () => {
    setTransitionClass('');
  };

  const wrapperProps = {
    className: transitionClass || undefined,
    onAnimationEnd: handleAnimationEnd,
  };

  switch (view.kind) {
    case 'hub':
      return (
        <div {...wrapperProps}>
          <Hub
            onOpenCampaign={openCampaign}
            onOpenMapCreator={openMapCreator}
          />
        </div>
      );
    case 'canvas':
      return (
        <div {...wrapperProps}>
          <InfiniteCanvas />
        </div>
      );
    case 'mapCreator':
      return (
        <div {...wrapperProps}>
          <div style={{ minHeight: '100vh', background: 'var(--color-bg-base)', padding: 'var(--space-8)' }}>
            <button onClick={goToHub} style={{ color: 'var(--color-text-accent)', background: 'none', border: '1px solid var(--color-accent-border)', borderRadius: 'var(--radius-md)', padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              ← Back to Hub
            </button>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '2rem', fontFamily: 'var(--font-body)' }}>Map Creator — coming soon</p>
          </div>
        </div>
      );
  }
}

export default App;

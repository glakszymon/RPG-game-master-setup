import { useState, useCallback } from 'react';
import { InfiniteCanvas } from './canvas';
import { Hub } from './views/Hub';

type AppView =
  | { kind: 'hub' }
  | { kind: 'canvas'; campaignId: string }
  | { kind: 'mapCreator' };

/**
 * App — main application entry point with view routing.
 *
 * Routes between Hub (campaign selection), Canvas (campaign session),
 * and Map Creator. No library needed — simple state-based routing.
 */
function App() {
  const [view, setView] = useState<AppView>({ kind: 'hub' });

  const openCampaign = useCallback((campaignId: string) => {
    setView({ kind: 'canvas', campaignId });
  }, []);

  const openMapCreator = useCallback(() => {
    setView({ kind: 'mapCreator' });
  }, []);

  const goToHub = useCallback(() => {
    setView({ kind: 'hub' });
  }, []);

  switch (view.kind) {
    case 'hub':
      return (
        <Hub
          onOpenCampaign={openCampaign}
          onOpenMapCreator={openMapCreator}
        />
      );
    case 'canvas':
      return <InfiniteCanvas />;
    case 'mapCreator':
      return (
        <div>
          <button onClick={goToHub}>Back to Hub</button>
          <p>Map Creator — placeholder</p>
        </div>
      );
  }
}

export default App;

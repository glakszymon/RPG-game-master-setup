import { InfiniteCanvas } from './canvas';

/**
 * App — main application entry point.
 *
 * Currently renders the infinite canvas workspace directly.
 * Will be replaced with a Hub/Router that switches between
 * the canvas (campaign session) and other views (hub, map editor).
 */
function App() {
  return <InfiniteCanvas />;
}

export default App;

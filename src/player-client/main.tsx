import { createRoot } from 'react-dom/client';
import { PlayerApp } from './PlayerApp';

const root = createRoot(document.getElementById('root')!);
root.render(<PlayerApp />);

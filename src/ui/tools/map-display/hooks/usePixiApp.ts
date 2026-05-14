import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';

/**
 * usePixiApp — mounts a Pixi.js Application into a container div.
 *
 * Returns [appRef, isReady] — isReady flips to true once app.init()
 * resolves and the canvas is appended, triggering dependent effects.
 */
export function usePixiApp(
  containerRef: React.RefObject<HTMLDivElement | null>,
): [React.RefObject<Application | null>, boolean] {
  const appRef = useRef<Application | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const app = new Application();
    let destroyed = false;

    app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
    }).then(() => {
      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      container.appendChild(app.canvas);
      appRef.current = app;
      setIsReady(true);
    });

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      setIsReady(false);
    };
  }, [containerRef]);

  return [appRef, isReady];
}

import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';

/**
 * usePixiApp — mounts a Pixi.js Application into a container div.
 *
 * Returns [appRef, isReady]. Uses ResizeObserver to keep the canvas
 * in sync with container size changes (e.g. window creation, resize).
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
    let resizeObserver: ResizeObserver | null = null;

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

      // Force initial resize since container may have had 0 dimensions during init
      app.resize();

      // Watch for container size changes and force Pixi to resize
      resizeObserver = new ResizeObserver(() => {
        if (!destroyed && appRef.current) {
          appRef.current.resize();
        }
      });
      resizeObserver.observe(container);

      setIsReady(true);
    });

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      setIsReady(false);
    };
  }, [containerRef]);

  return [appRef, isReady];
}

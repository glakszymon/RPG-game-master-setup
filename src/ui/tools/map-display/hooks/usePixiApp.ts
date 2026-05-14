import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null);
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
    });
    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [containerRef]);
  return appRef;
}
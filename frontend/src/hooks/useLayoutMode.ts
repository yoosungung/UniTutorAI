import { useEffect, useState } from 'react';
import { layoutModeFromSize, type LayoutMode } from '../lib/viewport';

export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(() => {
    if (typeof window === 'undefined') return 'sideBySide';
    return layoutModeFromSize(window.innerWidth, window.innerHeight);
  });

  useEffect(() => {
    const update = () => {
      setMode(layoutModeFromSize(window.innerWidth, window.innerHeight));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return mode;
}

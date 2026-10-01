import type { PathItem } from '../types/path';

/** Active focus on the path: detour wins over current. */
export function activePathItem(path: PathItem[]): PathItem | undefined {
  return (
    path.find((p) => p.placement === 'detour') ??
    path.find((p) => p.placement === 'current')
  );
}

import type { DetourInserted } from '../types/events';
import type { KnowledgeDag, PathItem } from '../types/path';

export type InsertDetourInput = {
  path: PathItem[];
  stuckSpanId: string;
  detourSpanId: string;
};

export type InsertDetourResult = {
  path: PathItem[];
  event: DetourInserted;
};

/** Immediate prerequisite of stuck span from static DAG edges (from → to). */
export function pickPrerequisiteDetour(
  dag: KnowledgeDag,
  stuckSpanId: string,
): string | null {
  const edge = dag.edges.find((e) => e.to === stuckSpanId);
  return edge?.from ?? null;
}

/**
 * On stuck: splice placement=detour ahead of the stuck scene and fill returnToSpanId.
 * Detour is active (no separate current); original stuck becomes planned until completeDetour.
 */
export function insertDetour(input: InsertDetourInput): InsertDetourResult {
  const { path, stuckSpanId, detourSpanId } = input;
  const stuckIndex = path.findIndex(
    (p) => p.sourceSpanId === stuckSpanId && p.placement === 'current',
  );
  if (stuckIndex < 0) {
    throw new Error(`stuck span must be current: ${stuckSpanId}`);
  }

  const next: PathItem[] = path.map((p) =>
    p.sourceSpanId === stuckSpanId && p.placement === 'current'
      ? { sourceSpanId: p.sourceSpanId, placement: 'planned' as const }
      : { ...p },
  );

  const detourItem: PathItem = {
    sourceSpanId: detourSpanId,
    placement: 'detour',
    returnToSpanId: stuckSpanId,
  };
  next.splice(stuckIndex, 0, detourItem);

  return {
    path: next,
    event: {
      type: 'DetourInserted',
      detourSpanId,
      returnToSpanId: stuckSpanId,
    },
  };
}

/** End detour span → restore returnToSpanId as current on the same path (no screen hop). */
export function completeDetour(path: PathItem[]): PathItem[] {
  const detour = path.find((p) => p.placement === 'detour');
  if (!detour?.returnToSpanId) {
    throw new Error('no active detour to complete');
  }
  const returnTo = detour.returnToSpanId;
  return path
    .filter((p) => p.placement !== 'detour')
    .map((p) =>
      p.sourceSpanId === returnTo
        ? { sourceSpanId: p.sourceSpanId, placement: 'current' as const }
        : p,
    );
}

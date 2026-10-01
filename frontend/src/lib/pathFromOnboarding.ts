import type { KnowledgeDag, PathItem } from '../types/path';

export type BuildPathFromOnboardingInput = {
  dag: KnowledgeDag;
  knownSpanIds: string[];
};

/**
 * Shrink today's path after onboarding: known → skipped, first unknown → current, rest → planned.
 */
export function buildPathFromOnboarding(
  input: BuildPathFromOnboardingInput,
): PathItem[] {
  const { dag, knownSpanIds } = input;
  const nodeSet = new Set(dag.nodes);
  for (const id of knownSpanIds) {
    if (!nodeSet.has(id)) {
      throw new Error(`known span not in DAG: ${id}`);
    }
  }
  const known = new Set(knownSpanIds);
  let placedCurrent = false;
  return dag.nodes.map((sourceSpanId) => {
    if (known.has(sourceSpanId)) {
      return { sourceSpanId, placement: 'skipped' as const };
    }
    if (!placedCurrent) {
      placedCurrent = true;
      return { sourceSpanId, placement: 'current' as const };
    }
    return { sourceSpanId, placement: 'planned' as const };
  });
}

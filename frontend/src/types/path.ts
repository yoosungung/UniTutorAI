/** Path item + knowledge DAG — ARCHITECTURE.md §2.2 */

export type PathPlacement = 'planned' | 'skipped' | 'current' | 'detour';

export type PathItem = {
  sourceSpanId: string;
  placement: PathPlacement;
  /** Set only when placement is detour — scene to resume after the detour. */
  returnToSpanId?: string;
};

export type KnowledgeDagEdge = {
  from: string;
  to: string;
};

/** Static prerequisite graph over SourceSpan.id (client-side, $0). */
export type KnowledgeDag = {
  courseId: string;
  /** Default walk order (lecture sequence). */
  nodes: string[];
  edges: KnowledgeDagEdge[];
};

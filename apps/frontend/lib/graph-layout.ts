import type { CommitInfo } from '@/lib/git';

// ─── Types ──────────────────────────────────────────────────────────

type GraphEdge = {
  fromLane: number;
  toLane: number;
  toHash: string;
  isMerge: boolean;
};

type GraphNode = {
  hash: string;
  lane: number;
  parents: string[];
  /** Lanes active before this commit is processed (lines from above) */
  lanesAbove: ReadonlyArray<number>;
  /** Lanes active after this commit is processed (lines going below) */
  lanesBelow: ReadonlyArray<number>;
  edges: ReadonlyArray<GraphEdge>;
};

type GraphLayout = {
  nodes: ReadonlyArray<GraphNode>;
  maxLane: number;
};

export type { GraphEdge, GraphNode, GraphLayout };

// ─── Algorithm ──────────────────────────────────────────────────────

const findFirstEmpty = (lanes: ReadonlyArray<string | null>): number => {
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === null) return i;
  }
  return lanes.length;
};

const getActiveLaneIndices = (
  lanes: ReadonlyArray<string | null>,
): number[] => {
  const result: number[] = [];
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] !== null) result.push(i);
  }
  return result;
};

const trimTrailingNulls = (lanes: (string | null)[]): void => {
  while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
    lanes.pop();
  }
};

export const computeGraphLayout = (
  commits: ReadonlyArray<CommitInfo>,
): GraphLayout => {
  const activeLanes: (string | null)[] = [];
  const nodes: GraphNode[] = [];
  let maxLane = 0;

  for (const commit of commits) {
    // Step 1: Snapshot lanes from previous iteration (before allocating this commit)
    const lanesAbove = getActiveLaneIndices(activeLanes);

    // Step 2: Find or allocate lane for this commit
    let lane = activeLanes.indexOf(commit.hash);
    if (lane === -1) {
      lane = findFirstEmpty(activeLanes);
      if (lane === activeLanes.length) {
        activeLanes.push(commit.hash);
      } else {
        activeLanes[lane] = commit.hash;
      }
    }

    if (lane > maxLane) maxLane = lane;

    // Step 3: Build edges
    const edges: GraphEdge[] = [];

    if (commit.parents.length === 0) {
      // Root commit: lane dies
      activeLanes[lane] = null;
    } else {
      const firstParent = commit.parents[0];
      const existingFirstParentLane = activeLanes.indexOf(firstParent);

      if (existingFirstParentLane !== -1 && existingFirstParentLane !== lane) {
        // First parent already claimed by another branch → merge back
        edges.push({
          fromLane: lane,
          toLane: existingFirstParentLane,
          toHash: firstParent,
          isMerge: false,
        });
        activeLanes[lane] = null;
      } else {
        // First parent continues in this lane
        activeLanes[lane] = firstParent;
        edges.push({
          fromLane: lane,
          toLane: lane,
          toHash: firstParent,
          isMerge: false,
        });
      }

      // Additional parents (merge parents)
      for (let p = 1; p < commit.parents.length; p++) {
        const parent = commit.parents[p];
        const parentLane = activeLanes.indexOf(parent);

        if (parentLane !== -1) {
          // Parent already has a lane
          edges.push({
            fromLane: lane,
            toLane: parentLane,
            toHash: parent,
            isMerge: true,
          });
        } else {
          // Allocate new lane for this parent
          const newLane = findFirstEmpty(activeLanes);
          if (newLane === activeLanes.length) {
            activeLanes.push(parent);
          } else {
            activeLanes[newLane] = parent;
          }
          if (newLane > maxLane) maxLane = newLane;
          edges.push({
            fromLane: lane,
            toLane: newLane,
            toHash: parent,
            isMerge: true,
          });
        }
      }
    }

    // Step 4: Snapshot active lanes AFTER processing
    const lanesBelow = getActiveLaneIndices(activeLanes);

    // Step 5: Compact trailing nulls
    trimTrailingNulls(activeLanes);

    nodes.push({
      hash: commit.hash,
      lane,
      parents: commit.parents,
      lanesAbove,
      lanesBelow,
      edges,
    });
  }

  return { nodes, maxLane };
};

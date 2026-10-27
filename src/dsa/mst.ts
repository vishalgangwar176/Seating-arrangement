/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CampusEdge {
  u: string;
  v: string;
  weight: number; // distance in meters
  description: string;
}

export interface MSTResult {
  edges: CampusEdge[];
  totalWeight: number;
  steps: string[];
  algorithm: 'Kruskal' | 'Prim';
  operationsCount: number;
}

/**
 * Disjoint Set Union (DSU) with Path Compression and Union by Rank
 */
export class DisjointSet {
  parent: Map<string, string> = new Map();
  rank: Map<string, number> = new Map();

  constructor(elements: string[]) {
    elements.forEach((el) => {
      this.parent.set(el, el);
      this.rank.set(el, 0);
    });
  }

  find(i: string): string {
    const p = this.parent.get(i);
    if (p === undefined) return i;
    if (p === i) return i;
    // Path compression
    const root = this.find(p);
    this.parent.set(i, root);
    return root;
  }

  union(i: string, j: string): boolean {
    const rootI = this.find(i);
    const rootJ = this.find(j);

    if (rootI === rootJ) {
      return false; // Cycle detected
    }

    const rankI = this.rank.get(rootI) || 0;
    const rankJ = this.rank.get(rootJ) || 0;

    // Union by rank
    if (rankI < rankJ) {
      this.parent.set(rootI, rootJ);
    } else if (rankI > rankJ) {
      this.parent.set(rootJ, rootI);
    } else {
      this.parent.set(rootJ, rootI);
      this.rank.set(rootI, rankI + 1);
    }

    return true;
  }
}

/**
 * Kruskal's Algorithm for Minimum Spanning Tree
 * Complexity: O(E log E) or O(E log V)
 */
export function runKruskalsMST(vertices: string[], edges: CampusEdge[]): MSTResult {
  const steps: string[] = [];
  let operations = 0;

  // 1. Sort all edges in non-decreasing order of weight
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  operations += sortedEdges.length * Math.log2(sortedEdges.length || 1);

  steps.push(
    `Sorted ${sortedEdges.length} inter-hall network edges by cable distance in ascending order.`
  );

  const dsu = new DisjointSet(vertices);
  const mstEdges: CampusEdge[] = [];
  let totalWeight = 0;

  for (const edge of sortedEdges) {
    operations++;
    const rootU = dsu.find(edge.u);
    const rootV = dsu.find(edge.v);

    if (rootU !== rootV) {
      dsu.union(edge.u, edge.v);
      mstEdges.push(edge);
      totalWeight += edge.weight;
      steps.push(
        `Added edge (${edge.u} <-> ${edge.v}, ${edge.weight}m) to MST. Connected components merged.`
      );

      if (mstEdges.length === vertices.length - 1) {
        steps.push(`MST complete with ${mstEdges.length} edges connecting all ${vertices.length} venues.`);
        break;
      }
    } else {
      steps.push(
        `Discarded edge (${edge.u} <-> ${edge.v}, ${edge.weight}m) as it forms a cycle in component ${rootU}.`
      );
    }
  }

  return {
    edges: mstEdges,
    totalWeight,
    steps,
    algorithm: 'Kruskal',
    operationsCount: Math.round(operations),
  };
}

/**
 * Prim's Algorithm for Minimum Spanning Tree
 * Complexity: O(V^2) or O(E log V)
 */
export function runPrimsMST(
  vertices: string[],
  edges: CampusEdge[],
  startVertex: string = vertices[0]
): MSTResult {
  const steps: string[] = [];
  let operations = 0;
  const inMST = new Set<string>();
  const mstEdges: CampusEdge[] = [];
  let totalWeight = 0;

  // Build adjacency list for fast neighbor lookup
  const adj: Map<string, { neighbor: string; weight: number; edge: CampusEdge }[]> = new Map();
  vertices.forEach((v) => adj.set(v, []));

  edges.forEach((edge) => {
    adj.get(edge.u)?.push({ neighbor: edge.v, weight: edge.weight, edge });
    adj.get(edge.v)?.push({ neighbor: edge.u, weight: edge.weight, edge });
  });

  inMST.add(startVertex);
  steps.push(`Prim's Algorithm started from root venue: ${startVertex}.`);

  while (inMST.size < vertices.length) {
    let minEdge: CampusEdge | null = null;
    let minWeight = Infinity;
    let nextVertex = '';

    // Search for minimum weight edge crossing cut
    for (const u of inMST) {
      const neighbors = adj.get(u) || [];
      for (const item of neighbors) {
        operations++;
        if (!inMST.has(item.neighbor) && item.weight < minWeight) {
          minWeight = item.weight;
          minEdge = item.edge;
          nextVertex = item.neighbor;
        }
      }
    }

    if (!minEdge || !nextVertex) {
      steps.push(`Warning: Graph is disconnected. Remaining vertices unreachable.`);
      break;
    }

    inMST.add(nextVertex);
    mstEdges.push(minEdge);
    totalWeight += minEdge.weight;
    steps.push(
      `Grew tree to include ${nextVertex} via edge (${minEdge.u} <-> ${minEdge.v}, ${minEdge.weight}m).`
    );
  }

  return {
    edges: mstEdges,
    totalWeight,
    steps,
    algorithm: 'Prim',
    operationsCount: operations,
  };
}

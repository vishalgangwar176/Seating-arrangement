/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RouteNode {
  id: string;
  name: string;
  type: 'control' | 'hall' | 'corridor' | 'gate' | 'seat_block';
  floor: number;
}

export interface RouteEdge {
  from: string;
  to: string;
  distanceMeters: number;
  description: string;
}

export interface DijkstraResult {
  sourceId: string;
  targetId: string;
  shortestDistance: number;
  path: string[];
  pathNodes: RouteNode[];
  steps: string[];
  distanceMap: Record<string, number>;
  operationsCount: number;
}

export function runDijkstra(
  nodes: RouteNode[],
  edges: RouteEdge[],
  sourceId: string,
  targetId: string
): DijkstraResult {
  const steps: string[] = [];
  let operations = 0;

  const nodeMap = new Map<string, RouteNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Build undirected adjacency list
  const adj = new Map<string, { neighbor: string; dist: number; desc: string }[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    adj.get(e.from)?.push({ neighbor: e.to, dist: e.distanceMeters, desc: e.description });
    adj.get(e.to)?.push({ neighbor: e.from, dist: e.distanceMeters, desc: e.description });
  });

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  nodes.forEach((node) => {
    distances[node.id] = node.id === sourceId ? 0 : Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  steps.push(`Dijkstra Initialized: Source = ${nodeMap.get(sourceId)?.name || sourceId} (distance = 0m).`);

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest distance
    let current: string | null = null;
    let minDist = Infinity;

    for (const nodeId of unvisited) {
      operations++;
      if (distances[nodeId] < minDist) {
        minDist = distances[nodeId];
        current = nodeId;
      }
    }

    if (!current || minDist === Infinity) {
      steps.push(`Remaining unvisited venues are unreachable from source.`);
      break;
    }

    unvisited.delete(current);
    const currNode = nodeMap.get(current);

    if (current === targetId) {
      steps.push(`Target ${currNode?.name || targetId} reached with distance ${minDist}m.`);
      break;
    }

    const neighbors = adj.get(current) || [];
    for (const edge of neighbors) {
      operations++;
      if (unvisited.has(edge.neighbor)) {
        const alt = distances[current] + edge.dist;
        if (alt < distances[edge.neighbor]) {
          const oldDist = distances[edge.neighbor];
          distances[edge.neighbor] = alt;
          previous[edge.neighbor] = current;
          const targetName = nodeMap.get(edge.neighbor)?.name || edge.neighbor;
          steps.push(
            `Relaxed edge [${currNode?.name} -> ${targetName}]: Distance reduced from ${oldDist === Infinity ? 'INF' : oldDist + 'm'} to ${alt}m via ${edge.desc}.`
          );
        }
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = targetId;

  if (distances[targetId] !== Infinity) {
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }
  }

  const pathNodes = path.map((id) => nodeMap.get(id)!).filter(Boolean);

  return {
    sourceId,
    targetId,
    shortestDistance: distances[targetId] === Infinity ? -1 : distances[targetId],
    path,
    pathNodes,
    steps,
    distanceMap: distances,
    operationsCount: operations,
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall, Seat, Student, ConflictInfo } from '../types';

export interface GraphTraversalStep {
  currentSeatId: string;
  visitedOrder: string[];
  frontier: string[]; // queue for BFS, stack for DFS
  actionDescription: string;
}

export class SeatGraph {
  hallId: string;
  vertices: string[] = []; // Seat IDs that are usable (not aisles)
  adjacencyList: Map<string, string[]> = new Map();
  seatMap: Map<string, Seat> = new Map();

  constructor(hall: Hall) {
    this.hallId = hall.id;
    this.buildGraph(hall);
  }

  private buildGraph(hall: Hall): void {
    const seatGrid: (Seat | null)[][] = Array.from({ length: hall.rows }, () =>
      Array(hall.cols).fill(null)
    );

    // Register usable seats
    hall.seats.forEach((seat) => {
      this.seatMap.set(seat.id, seat);
      seatGrid[seat.row][seat.col] = seat;
      if (seat.status !== 'aisle') {
        this.vertices.push(seat.id);
        this.adjacencyList.set(seat.id, []);
      }
    });

    // Create orthogonal edges (Up, Down, Left, Right)
    // Edges exist only if both seats are not aisles and neither is severed
    const dr = [-1, 1, 0, 0];
    const dc = [0, 0, -1, 1];

    for (let r = 0; r < hall.rows; r++) {
      for (let c = 0; c < hall.cols; c++) {
        const currentSeat = seatGrid[r][c];
        if (!currentSeat || currentSeat.status === 'aisle') continue;

        for (let i = 0; i < 4; i++) {
          const nr = r + dr[i];
          const nc = c + dc[i];

          if (nr >= 0 && nr < hall.rows && nc >= 0 && nc < hall.cols) {
            const neighborSeat = seatGrid[nr][nc];
            if (neighborSeat && neighborSeat.status !== 'aisle') {
              // Add undirected edge
              const neighbors = this.adjacencyList.get(currentSeat.id) || [];
              if (!neighbors.includes(neighborSeat.id)) {
                neighbors.push(neighborSeat.id);
                this.adjacencyList.set(currentSeat.id, neighbors);
              }
            }
          }
        }
      }
    }
  }

  getNeighbors(seatId: string): string[] {
    return this.adjacencyList.get(seatId) || [];
  }

  // Generate Adjacency Matrix representation
  getAdjacencyMatrix(): {
    matrix: number[][];
    seatLabels: string[];
    spaceBytesEstimate: number;
    adjacencyListBytesEstimate: number;
  } {
    const n = this.vertices.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const indexMap = new Map<string, number>();

    this.vertices.forEach((id, idx) => indexMap.set(id, idx));

    let edgeCount = 0;
    this.vertices.forEach((u, i) => {
      const neighbors = this.adjacencyList.get(u) || [];
      neighbors.forEach((v) => {
        const j = indexMap.get(v);
        if (j !== undefined) {
          matrix[i][j] = 1;
          edgeCount++;
        }
      });
    });

    // Space complexity comparison:
    // Matrix: V * V * 4 bytes (for 32-bit int)
    // List: V * 8 bytes (pointers) + 2 * E * 8 bytes (edges)
    const spaceBytesEstimate = n * n * 4;
    const adjacencyListBytesEstimate = n * 8 + edgeCount * 8;

    return {
      matrix,
      seatLabels: this.vertices,
      spaceBytesEstimate,
      adjacencyListBytesEstimate,
    };
  }

  // Breadth-First Search (BFS)
  runBFS(startSeatId: string): {
    visitedOrder: string[];
    steps: GraphTraversalStep[];
  } {
    const visited = new Set<string>();
    const queue: string[] = [];
    const visitedOrder: string[] = [];
    const steps: GraphTraversalStep[] = [];

    if (!this.adjacencyList.has(startSeatId)) {
      return { visitedOrder, steps };
    }

    queue.push(startSeatId);
    visited.add(startSeatId);

    steps.push({
      currentSeatId: startSeatId,
      visitedOrder: [...visitedOrder],
      frontier: [...queue],
      actionDescription: `Initialize BFS: Enqueue source seat ${startSeatId}. Mark as visited.`,
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      visitedOrder.push(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }

      steps.push({
        currentSeatId: current,
        visitedOrder: [...visitedOrder],
        frontier: [...queue],
        actionDescription: `Dequeued seat ${current}. Explored orthogonal neighbors: [${neighbors.join(', ')}]. Queue: [${queue.join(', ')}].`,
      });
    }

    return { visitedOrder, steps };
  }

  // Depth-First Search (DFS)
  runDFS(startSeatId: string): {
    visitedOrder: string[];
    steps: GraphTraversalStep[];
  } {
    const visited = new Set<string>();
    const stack: string[] = [];
    const visitedOrder: string[] = [];
    const steps: GraphTraversalStep[] = [];

    if (!this.adjacencyList.has(startSeatId)) {
      return { visitedOrder, steps };
    }

    stack.push(startSeatId);

    steps.push({
      currentSeatId: startSeatId,
      visitedOrder: [...visitedOrder],
      frontier: [...stack],
      actionDescription: `Initialize DFS: Push source seat ${startSeatId} onto Call Stack.`,
    });

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (!visited.has(current)) {
        visited.add(current);
        visitedOrder.push(current);

        const neighbors = this.adjacencyList.get(current) || [];
        // Push unvisited neighbors in reverse order to visit left-to-right
        for (let i = neighbors.length - 1; i >= 0; i--) {
          const neighbor = neighbors[i];
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }

        steps.push({
          currentSeatId: current,
          visitedOrder: [...visitedOrder],
          frontier: [...stack],
          actionDescription: `Popped seat ${current} from Call Stack. Discovered neighbors: [${neighbors.join(', ')}]. Current Stack: [${stack.join(', ')}].`,
        });
      }
    }

    return { visitedOrder, steps };
  }

  // Find Connected Components (e.g. Left seating block vs Right seating block across central aisle)
  findConnectedComponents(): {
    components: string[][];
    componentMap: Map<string, number>;
  } {
    const visited = new Set<string>();
    const components: string[][] = [];
    const componentMap = new Map<string, number>();

    for (const seatId of this.vertices) {
      if (!visited.has(seatId)) {
        const currentComp: string[] = [];
        const queue = [seatId];
        visited.add(seatId);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          currentComp.push(curr);
          componentMap.set(curr, components.length);

          const neighbors = this.adjacencyList.get(curr) || [];
          for (const nb of neighbors) {
            if (!visited.has(nb)) {
              visited.add(nb);
              queue.push(nb);
            }
          }
        }
        components.push(currentComp);
      }
    }

    return { components, componentMap };
  }

  // Conflict Audit across all adjacent edges
  auditConflicts(studentMap: Map<number, Student>): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const inspectedEdges = new Set<string>();

    for (const u of this.vertices) {
      const seatU = this.seatMap.get(u);
      if (!seatU || !seatU.studentRoll) continue;
      const studentU = studentMap.get(seatU.studentRoll);
      if (!studentU) continue;

      const neighbors = this.adjacencyList.get(u) || [];
      for (const v of neighbors) {
        // Avoid duplicate pair check
        const edgeKey = u < v ? `${u}-${v}` : `${v}-${u}`;
        if (inspectedEdges.has(edgeKey)) continue;
        inspectedEdges.add(edgeKey);

        const seatV = this.seatMap.get(v);
        if (!seatV || !seatV.studentRoll) continue;
        const studentV = studentMap.get(seatV.studentRoll);
        if (!studentV) continue;

        const sameBranch = studentU.branch === studentV.branch;
        const sameSubject = studentU.subject === studentV.subject;

        if (sameBranch || sameSubject) {
          const relation = seatU.row === seatV.row ? 'horizontal' : 'vertical';
          conflicts.push({
            seatId1: u,
            seatId2: v,
            student1: studentU,
            student2: studentV,
            type: sameBranch && sameSubject ? 'both' : sameBranch ? 'same_branch' : 'same_subject',
            relation,
          });
        }
      }
    }

    return conflicts;
  }
}

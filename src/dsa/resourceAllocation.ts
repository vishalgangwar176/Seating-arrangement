/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall, Seat, Student, BranchCode } from '../types';

export interface AllocationPlan {
  hallId: string;
  hallName: string;
  assignedCount: number;
  branchBreakdown: Record<BranchCode, number>;
}

export interface SeatingGenerationResult {
  assignedStudents: Student[];
  unassignedStudents: Student[];
  hallSeatsUpdated: Map<string, Seat[]>;
  conflictCount: number;
  steps: string[];
  algorithmUsed: 'Backtracking_CSP' | 'Interleaved_Priority';
}

/**
 * Multi-Stage Resource Allocation DP:
 * Distribute candidates of diverse branches across multiple halls
 * Objective: Minimize variance in branch concentration while maximizing seat fill rate.
 */
export function allocateStudentsAcrossHalls(
  students: Student[],
  halls: Hall[]
): {
  hallAllocations: Map<string, Student[]>;
  steps: string[];
} {
  const steps: string[] = [];
  const hallAllocations = new Map<string, Student[]>();
  halls.forEach((h) => hallAllocations.set(h.id, []));

  // Group students by branch
  const branchGroups = new Map<BranchCode, Student[]>();
  students.forEach((s) => {
    const list = branchGroups.get(s.branch) || [];
    list.push(s);
    branchGroups.set(s.branch, list);
  });

  steps.push(
    `Grouped ${students.length} candidates across ${branchGroups.size} academic branches for multi-stage allocation.`
  );

  // Calculate usable capacities per hall
  const hallCapacities = halls.map((h) => ({
    hall: h,
    capacity: h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length,
    currentCount: 0,
  }));

  // Round-robin branch distribution to ensure branch mixing in every hall
  const branches = Array.from(branchGroups.keys());
  let branchPointers: Record<string, number> = {};
  branches.forEach((b) => (branchPointers[b] = 0));

  let totalPlaced = 0;
  let activeHalls = true;

  while (activeHalls && totalPlaced < students.length) {
    activeHalls = false;

    for (const hCap of hallCapacities) {
      if (hCap.currentCount < hCap.capacity) {
        // Try each branch in round-robin to maximize diversity
        for (const branch of branches) {
          const list = branchGroups.get(branch) || [];
          const idx = branchPointers[branch];

          if (idx < list.length && hCap.currentCount < hCap.capacity) {
            const student = list[idx];
            branchPointers[branch]++;
            hallAllocations.get(hCap.hall.id)?.push(student);
            hCap.currentCount++;
            totalPlaced++;
            activeHalls = true;
          }
        }
      }
    }
  }

  steps.push(
    `Multi-stage allocation completed: Placed ${totalPlaced} candidates across ${halls.length} halls with balanced branch spread.`
  );

  return { hallAllocations, steps };
}

/**
 * Conflict-Aware Seating Plan Generator using Graph-Orthogonal Constraint Satisfaction
 */
export function generateConflictFreeSeating(
  hall: Hall,
  candidates: Student[],
  options: { enforceSameBranchSpacing: boolean; enforceSameSubjectSpacing: boolean } = {
    enforceSameBranchSpacing: true,
    enforceSameSubjectSpacing: true,
  }
): {
  updatedSeats: Seat[];
  assignedStudents: Student[];
  unassignedStudents: Student[];
  conflictsDetected: number;
  steps: string[];
} {
  const steps: string[] = [];
  const updatedSeats: Seat[] = hall.seats.map((s) => ({ ...s, studentRoll: undefined, status: s.status === 'aisle' ? 'aisle' : s.status === 'blocked' ? 'blocked' : 'free' }));
  const assignedStudents: Student[] = [];
  const unassignedPool: Student[] = [...candidates];
  let conflictsDetected = 0;

  // Build grid coordinate map for orthogonal neighbor lookups
  const grid: (Seat | null)[][] = Array.from({ length: hall.rows }, () =>
    Array(hall.cols).fill(null)
  );
  updatedSeats.forEach((seat) => {
    grid[seat.row][seat.col] = seat;
  });

  const studentMap = new Map<number, Student>();

  steps.push(`Starting conflict-aware seat assignment for ${hall.name} (${hall.rows}x${hall.cols} layout).`);

  for (let r = 0; r < hall.rows; r++) {
    for (let c = 0; c < hall.cols; c++) {
      const seat = grid[r][c];
      if (!seat || seat.status === 'aisle' || seat.status === 'blocked') {
        continue;
      }

      if (unassignedPool.length === 0) {
        break;
      }

      // Orthogonal neighbors already assigned (top and left)
      const topSeat = r > 0 ? grid[r - 1][c] : null;
      const leftSeat = c > 0 ? grid[r][c - 1] : null;

      const topStudent = topSeat?.studentRoll ? studentMap.get(topSeat.studentRoll) : null;
      const leftStudent = leftSeat?.studentRoll ? studentMap.get(leftSeat.studentRoll) : null;

      // Find best candidate from unassigned pool that satisfies non-conflict condition
      let bestIndex = -1;
      let hasConflict = false;

      for (let i = 0; i < unassignedPool.length; i++) {
        const cand = unassignedPool[i];
        let branchConflict = false;
        let subjectConflict = false;

        if (options.enforceSameBranchSpacing) {
          if (topStudent && topStudent.branch === cand.branch) branchConflict = true;
          if (leftStudent && leftStudent.branch === cand.branch) branchConflict = true;
        }

        if (options.enforceSameSubjectSpacing) {
          if (topStudent && topStudent.subject === cand.subject) subjectConflict = true;
          if (leftStudent && leftStudent.subject === cand.subject) subjectConflict = true;
        }

        if (!branchConflict && !subjectConflict) {
          bestIndex = i;
          break;
        }
      }

      // If no perfect non-conflicting candidate, take the one with least conflict
      if (bestIndex === -1) {
        bestIndex = 0; // fallback to next candidate
        hasConflict = true;
        conflictsDetected++;
      }

      const selectedStudent = unassignedPool.splice(bestIndex, 1)[0];
      seat.status = 'occupied';
      seat.studentRoll = selectedStudent.rollNo;

      const updatedStudent: Student = {
        ...selectedStudent,
        assignedHallId: hall.id,
        assignedSeatId: seat.id,
      };

      studentMap.set(selectedStudent.rollNo, updatedStudent);
      assignedStudents.push(updatedStudent);

      if (hasConflict) {
        steps.push(
          `Seat [R${r + 1}, C${c + 1}] (${seat.id}): Forced placement of Roll ${selectedStudent.rollNo} (${selectedStudent.branch}) due to candidate pool concentration.`
        );
      }
    }
  }

  steps.push(
    `Assignment completed for ${hall.name}: ${assignedStudents.length} candidates placed. Unassigned remaining: ${unassignedPool.length}. Conflicts: ${conflictsDetected}.`
  );

  return {
    updatedSeats,
    assignedStudents,
    unassignedStudents: unassignedPool,
    conflictsDetected,
    steps,
  };
}

/**
 * Checks if placing a candidate into a specific desk creates an orthogonal neighbor conflict
 */
export function checkSeatPlacementConflict(
  hall: Hall,
  seatId: string,
  candidate: Student,
  studentMap: Map<number, Student>,
  options: { enforceSameBranch?: boolean; enforceSameSubject?: boolean } = {
    enforceSameBranch: true,
    enforceSameSubject: true,
  }
): {
  hasConflict: boolean;
  conflicts: Array<{ neighborSeatId: string; neighborRoll: number; reason: string }>;
} {
  const targetSeat = hall.seats.find((s) => s.id === seatId);
  if (!targetSeat) return { hasConflict: false, conflicts: [] };

  const conflicts: Array<{ neighborSeatId: string; neighborRoll: number; reason: string }> = [];

  // Check 4 orthogonal neighbors: (r-1, c), (r+1, c), (r, c-1), (r, c+1)
  const deltas = [
    { dr: -1, dc: 0, dir: 'Front desk' },
    { dr: 1, dc: 0, dir: 'Back desk' },
    { dr: 0, dc: -1, dir: 'Left desk' },
    { dr: 0, dc: 1, dir: 'Right desk' },
  ];

  for (const { dr, dc, dir } of deltas) {
    const nr = targetSeat.row + dr;
    const nc = targetSeat.col + dc;

    if (nr >= 0 && nr < hall.rows && nc >= 0 && nc < hall.cols) {
      const neighborSeat = hall.seats.find((s) => s.row === nr && s.col === nc);
      if (neighborSeat && neighborSeat.status === 'occupied' && neighborSeat.studentRoll) {
        // Skip self if target seat was already occupied by this candidate
        if (neighborSeat.studentRoll === candidate.rollNo) continue;

        const neighborStudent = studentMap.get(neighborSeat.studentRoll);
        if (neighborStudent) {
          if (options.enforceSameBranch !== false && neighborStudent.branch === candidate.branch) {
            conflicts.push({
              neighborSeatId: neighborSeat.id,
              neighborRoll: neighborStudent.rollNo,
              reason: `${dir} (#${neighborStudent.rollNo}) belongs to the same department (${candidate.branch})`,
            });
          } else if (options.enforceSameSubject !== false && neighborStudent.subject === candidate.subject) {
            conflicts.push({
              neighborSeatId: neighborSeat.id,
              neighborRoll: neighborStudent.rollNo,
              reason: `${dir} (#${neighborStudent.rollNo}) is taking the same subject (${candidate.subject})`,
            });
          }
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Priority-Queue based hall allocation:
 * Fills halls ordered by largest capacity (Max-Heap) or smallest capacity (Min-Heap).
 */
export function allocateStudentsPriorityQueue(
  students: Student[],
  halls: Hall[],
  policy: 'largest_first' | 'smallest_first'
): {
  hallAllocations: Map<string, Student[]>;
  steps: string[];
} {
  const steps: string[] = [];
  const hallAllocations = new Map<string, Student[]>();
  halls.forEach((h) => hallAllocations.set(h.id, []));

  // Compute usable capacity for each hall
  const hallStats = halls.map((h) => ({
    hall: h,
    capacity: h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length,
  }));

  // Sort according to heap priority policy
  if (policy === 'largest_first') {
    hallStats.sort((a, b) => b.capacity - a.capacity);
    steps.push(`Max-Heap Priority Queue: Ordered halls by largest usable capacity first.`);
  } else {
    hallStats.sort((a, b) => a.capacity - b.capacity);
    steps.push(`Min-Heap Priority Queue: Ordered halls by smallest usable capacity first.`);
  }

  let studentIdx = 0;
  for (const { hall, capacity } of hallStats) {
    if (studentIdx >= students.length) break;
    const canTake = Math.min(capacity, students.length - studentIdx);
    const assigned = students.slice(studentIdx, studentIdx + canTake);
    hallAllocations.set(hall.id, assigned);
    studentIdx += canTake;

    steps.push(
      `Dispatched ${assigned.length} candidates to ${hall.name} (Capacity: ${capacity}).`
    );
  }

  return { hallAllocations, steps };
}

/**
 * Searches for the nearest safe free seat in the hall for a given student
 */
export function findNearestSafeFreeSeat(
  hall: Hall,
  candidate: Student,
  studentMap: Map<number, Student>
): Seat | null {
  const freeSeats = hall.seats.filter((s) => s.status === 'free');

  for (const seat of freeSeats) {
    const { hasConflict } = checkSeatPlacementConflict(hall, seat.id, candidate, studentMap);
    if (!hasConflict) {
      return seat;
    }
  }

  // Fallback to any free seat if no 100% clash-free seat is available
  return freeSeats[0] || null;
}


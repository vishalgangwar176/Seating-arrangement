/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BranchCode = 'CSE' | 'ECE' | 'MECH' | 'AIDS' | 'CIVIL' | 'IT';

export interface Student {
  rollNo: number; // Primary key for BST/AVL
  name: string;
  branch: BranchCode;
  subject: string;
  semester: number;
  assignedHallId?: string;
  assignedSeatId?: string;
}

export type SeatStatus = 'free' | 'occupied' | 'blocked' | 'aisle';

export interface Seat {
  id: string; // e.g. "H1-R1-C1"
  hallId: string;
  row: number;
  col: number;
  status: SeatStatus;
  studentRoll?: number;
}

export interface Hall {
  id: string;
  name: string;
  block: string;
  floor: number;
  rows: number;
  cols: number;
  costWeight: number; // For DP Knapsack/Graph distance
  seats: Seat[];
  isActive: boolean;
}

export interface ConflictInfo {
  seatId1: string;
  seatId2: string;
  student1: Student;
  student2: Student;
  type: 'same_branch' | 'same_subject' | 'both';
  relation: 'horizontal' | 'vertical' | 'diagonal';
  hallId?: string;
}

export interface AlgorithmTrace {
  id: string;
  timestamp: string;
  algorithmName: string;
  unit: string;
  problemSolved: string;
  timeComplexity: string;
  spaceComplexity: string;
  inputSummary: string;
  executionTimeMs: number;
  operationCount: number;
  steps: string[];
  resultSummary: string;
}

export type SyllabusStatus = 'Implemented' | 'Demonstrated' | 'Planned' | 'Not Used';

export interface SyllabusTopic {
  unit: number;
  unitTitle: string;
  topicName: string;
  status: SyllabusStatus;
  locationInApp: string;
  problemSolved: string;
  algorithmTriggered: string;
  timeComplexity: string;
  spaceComplexity: string;
  vivaExplanation: string;
  tradeoffOrLimitation: string;
}

export interface TestCaseResult {
  id: string;
  name: string;
  unit: string;
  description: string;
  expected: string;
  actual: string;
  status: 'passed' | 'failed' | 'not_run';
  details?: string;
  executionTimeMs?: number;
}

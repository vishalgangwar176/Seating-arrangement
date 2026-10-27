/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hall, Seat, Student, BranchCode } from '../types';
import { RouteNode, RouteEdge } from '../dsa/dijkstra';
import { CampusEdge } from '../dsa/mst';

export function createInitialHalls(): Hall[] {
  // Helper to build seats with aisle down a specific column
  const buildSeats = (
    hallId: string,
    rows: number,
    cols: number,
    aisleCol: number,
    blockedCoords: [number, number][] = []
  ): Seat[] => {
    const seats: Seat[] = [];
    const blockedSet = new Set(blockedCoords.map(([r, c]) => `${r}-${c}`));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = `${hallId}-R${r + 1}C${c + 1}`;
        let status: 'free' | 'aisle' | 'blocked' = 'free';

        if (c === aisleCol) {
          status = 'aisle';
        } else if (blockedSet.has(`${r}-${c}`)) {
          status = 'blocked';
        }

        seats.push({
          id,
          hallId,
          row: r,
          col: c,
          status,
        });
      }
    }
    return seats;
  };

  return [
    {
      id: 'hall-a101',
      name: 'Main Exam Hall A101',
      block: 'Block A (Science & Tech)',
      floor: 1,
      rows: 6,
      cols: 6,
      costWeight: 3,
      isActive: true,
      seats: buildSeats('hall-a101', 6, 6, 3, [
        [1, 0], // Broken bench R2-C1
        [4, 4], // Defective terminal R5-C5
      ]),
    },
    {
      id: 'hall-b204',
      name: 'Seminar Hall B204',
      block: 'Block B (Humanities)',
      floor: 2,
      rows: 5,
      cols: 5,
      costWeight: 4,
      isActive: true,
      seats: buildSeats('hall-b204', 5, 5, 2, [
        [0, 4], // Wall obstruction R1-C5
      ]),
    },
    {
      id: 'hall-m001',
      name: 'Mechanical Annex M001',
      block: 'Block M (Workshops)',
      floor: 0,
      rows: 4,
      cols: 6,
      costWeight: 2,
      isActive: true,
      seats: buildSeats('hall-m001', 4, 6, 2, []),
    },
    {
      id: 'hall-c302',
      name: 'Computing Hall C302',
      block: 'Block C (IT Complex)',
      floor: 3,
      rows: 6,
      cols: 5,
      costWeight: 5,
      isActive: true,
      seats: buildSeats('hall-c302', 6, 5, 2, [
        [2, 0], // Server rack obstruction R3-C1
      ]),
    },
  ];
}

export function createInitialStudents(): Student[] {
  const students: Student[] = [
    // CSE Branch - 20 candidates (Sub: Data Structures & Algorithms)
    { rollNo: 101, name: 'Aarav Sharma', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 102, name: 'Aditi Rao', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 103, name: 'Ananya Verma', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 104, name: 'Arjun Nair', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 105, name: 'Bhavna Kulkarni', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 106, name: 'Chetan Mehta', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 107, name: 'Devendra Patel', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 108, name: 'Divya Iyer', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 109, name: 'Eshaan Gupta', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 110, name: 'Farhan Akhtar', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 111, name: 'Gaurav Deshmukh', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 112, name: 'Harini Sundaram', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 113, name: 'Ishaan Malhotra', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 114, name: 'Jaya Bhattacharya', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 115, name: 'Kunal Singhania', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 116, name: 'Lavanya Reddy', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 117, name: 'Manish Joshi', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 118, name: 'Nandini Das', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 119, name: 'Omkar Shinde', branch: 'CSE', subject: 'Data Structures', semester: 4 },
    { rollNo: 120, name: 'Pooja Hegde', branch: 'CSE', subject: 'Data Structures', semester: 4 },

    // ECE Branch - 16 candidates (Sub: Digital Signal Processing)
    { rollNo: 201, name: 'Pranav Menon', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 202, name: 'Radhika Sen', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 203, name: 'Rohan Pillai', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 204, name: 'Sanjana Mishra', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 205, name: 'Siddharth Bose', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 206, name: 'Sneha Nambiar', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 207, name: 'Tanmay Saxena', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 208, name: 'Trisha Chawla', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 209, name: 'Utkarsh Trivedi', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 210, name: 'Vaishnavi R', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 211, name: 'Varun Grover', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 212, name: 'Vidya Balan', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 213, name: 'Yash Vardhan', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 214, name: 'Zoya Khan', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 215, name: 'Akhil Kapoor', branch: 'ECE', subject: 'Signal Processing', semester: 4 },
    { rollNo: 216, name: 'Bhavesh Soni', branch: 'ECE', subject: 'Signal Processing', semester: 4 },

    // MECH Branch - 14 candidates (Sub: Applied Thermodynamics)
    { rollNo: 301, name: 'Charan Teja', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 302, name: 'Deepak Rathore', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 303, name: 'Girish Kumar', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 304, name: 'Harshvardhan R', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 305, name: 'Indrajeet Chauhan', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 306, name: 'Karthik Raja', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 307, name: 'Lalit Pandit', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 308, name: 'Mayank Agrawal', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 309, name: 'Naveen Jindal', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 310, name: 'Pawan Kalyan', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 311, name: 'Rahul Dravid', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 312, name: 'Sachin Tendulkar', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 313, name: 'Tarun Tahiliani', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },
    { rollNo: 314, name: 'Vikas Swarup', branch: 'MECH', subject: 'Thermodynamics', semester: 4 },

    // AIDS Branch - 12 candidates (Sub: Machine Learning)
    { rollNo: 401, name: 'Alia Bhatt', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 402, name: 'Bhuvan Bam', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 403, name: 'Chhavi Mittal', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 404, name: 'Darshan Raval', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 405, name: 'Ekta Kapoor', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 406, name: 'Faizal Khan', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 407, name: 'Gita Gopinath', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 408, name: 'Hardik Pandya', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 409, name: 'Isha Ambani', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 410, name: 'Jitendra Kumar', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 411, name: 'Kavita Krishnamurthy', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
    { rollNo: 412, name: 'Lata Mangeshkar', branch: 'AIDS', subject: 'Machine Learning', semester: 4 },
  ];

  return students;
}

export const CAMPUS_ROUTE_NODES: RouteNode[] = [
  { id: 'node-control', name: 'Exam Cell (Control Room)', type: 'control', floor: 1 },
  { id: 'node-main-gate', name: 'Campus Main Entrance Gate', type: 'gate', floor: 0 },
  { id: 'node-corridor-a', name: 'Block A Ground Foyer', type: 'corridor', floor: 0 },
  { id: 'node-hall-a101', name: 'Hall A101 Main Door', type: 'hall', floor: 1 },
  { id: 'node-hall-a101-desk', name: 'Hall A101 Invigilator Desk', type: 'seat_block', floor: 1 },
  { id: 'node-corridor-b', name: 'Block B Central Staircase', type: 'corridor', floor: 1 },
  { id: 'node-hall-b204', name: 'Hall B204 Entry', type: 'hall', floor: 2 },
  { id: 'node-corridor-m', name: 'Block M Covered Walkway', type: 'corridor', floor: 0 },
  { id: 'node-hall-m001', name: 'Hall M001 Workshop Entry', type: 'hall', floor: 0 },
  { id: 'node-corridor-c', name: 'Block C IT Tower Lift Lobby', type: 'corridor', floor: 1 },
  { id: 'node-hall-c302', name: 'Hall C302 Computing Hall Entry', type: 'hall', floor: 3 },
];

export const CAMPUS_ROUTE_EDGES: RouteEdge[] = [
  { from: 'node-main-gate', to: 'node-corridor-a', distanceMeters: 45, description: 'North quadrangle tarmac path' },
  { from: 'node-corridor-a', to: 'node-control', distanceMeters: 20, description: 'Ground floor west corridor' },
  { from: 'node-control', to: 'node-hall-a101', distanceMeters: 30, description: 'First floor internal security ramp' },
  { from: 'node-hall-a101', to: 'node-hall-a101-desk', distanceMeters: 8, description: 'Hall aisle entry to dais' },
  { from: 'node-control', to: 'node-corridor-b', distanceMeters: 75, description: 'Inter-block glass skybridge' },
  { from: 'node-corridor-b', to: 'node-hall-b204', distanceMeters: 35, description: 'Second floor wing staircase' },
  { from: 'node-main-gate', to: 'node-corridor-m', distanceMeters: 60, description: 'South service path' },
  { from: 'node-corridor-m', to: 'node-hall-m001', distanceMeters: 25, description: 'Mechanical annex double door' },
  { from: 'node-control', to: 'node-corridor-m', distanceMeters: 90, description: 'Central quadrangle walkway' },
  { from: 'node-corridor-a', to: 'node-corridor-c', distanceMeters: 110, description: 'Main academic avenue' },
  { from: 'node-corridor-c', to: 'node-hall-c302', distanceMeters: 55, description: 'High-speed elevator to 3rd floor' },
  { from: 'node-hall-b204', to: 'node-hall-c302', distanceMeters: 95, description: 'Overhead interconnect walkway' },
];

export const CAMPUS_INTERCOM_VERTICES = [
  'Exam Cell Hub',
  'Hall A101',
  'Hall B204',
  'Hall M001',
  'Hall C302',
  'Campus Security Post',
  'Central Server Room',
];

export const CAMPUS_INTERCOM_EDGES: CampusEdge[] = [
  { u: 'Exam Cell Hub', v: 'Central Server Room', weight: 15, description: 'Direct high-bandwidth optical line' },
  { u: 'Exam Cell Hub', v: 'Hall A101', weight: 28, description: 'Cat6 Shielded Cable via Duct A' },
  { u: 'Exam Cell Hub', v: 'Campus Security Post', weight: 42, description: 'Armored ground conduit' },
  { u: 'Hall A101', v: 'Hall B204', weight: 65, description: 'Skybridge cable tray' },
  { u: 'Exam Cell Hub', v: 'Hall B204', weight: 70, description: 'Inter-block duct' },
  { u: 'Campus Security Post', v: 'Hall M001', weight: 35, description: 'Workshop perimeter conduit' },
  { u: 'Exam Cell Hub', v: 'Hall M001', weight: 80, description: 'Main spine trench' },
  { u: 'Central Server Room', v: 'Hall C302', weight: 50, description: 'IT tower vertical riser' },
  { u: 'Hall B204', v: 'Hall C302', weight: 78, description: 'Roof interconnect tray' },
  { u: 'Hall M001', v: 'Hall C302', weight: 120, description: 'Outer campus underground feeder' },
];

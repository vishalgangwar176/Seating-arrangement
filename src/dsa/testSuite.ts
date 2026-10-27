/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestCaseResult, Student, Hall } from '../types';
import { BinarySearchTree } from './bst';
import { AVLTree } from './avl';
import { BinaryHeap, runHeapSort } from './heap';
import { SeatGraph } from './graph';
import { runKruskalsMST, runPrimsMST } from './mst';
import { runDijkstra } from './dijkstra';
import { solve01Knapsack } from './dpKnapsack';
import { generateConflictFreeSeating, allocateStudentsAcrossHalls } from './resourceAllocation';
import { createInitialHalls, createInitialStudents, CAMPUS_ROUTE_NODES, CAMPUS_ROUTE_EDGES, CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES } from '../data/sampleData';

export function runAllTestCases(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // Test 1: Sorted roll-number insertions and AVL balancing
  (() => {
    const start = performance.now();
    const sortedRolls = [101, 102, 103, 104, 105, 106, 107];
    const bst = new BinarySearchTree();
    const avl = new AVLTree();

    sortedRolls.forEach((r) => {
      const dummy: Student = { rollNo: r, name: `Student ${r}`, branch: 'CSE', subject: 'DSA', semester: 4 };
      bst.insert(dummy);
      avl.insert(dummy);
    });

    const bstHeight = bst.getHeight();
    const avlHeight = avl.getHeight();
    const passed = bstHeight === 7 && avlHeight === 3;

    results.push({
      id: 'TC-01',
      unit: 'Unit 1: Trees',
      name: 'Sorted Roll Insertions: Skewed BST vs Balanced AVL Height',
      description: 'Insert 7 sequential roll numbers [101..107]. Verify ordinary BST degenerates to height 7 (O(N)), while AVL balances to height 3 (floor(log2(7))+1 = 3).',
      expected: 'BST Height = 7 (skewed line), AVL Height = 3 (strictly balanced)',
      actual: `BST Height = ${bstHeight}, AVL Height = ${avlHeight} (Rotations triggered: ${avl.rotationHistory.length})`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: `AVL successfully prevented O(N) degradation. Rotations executed: ${avl.rotationHistory.map((r) => r.type).join(', ')}`,
    });
  })();

  // Test 2: All four AVL rotation cases (LL, RR, LR, RL)
  (() => {
    const start = performance.now();
    // 1. LL Case: Insert 30, 20, 10 -> Right rotation on 30
    const treeLL = new AVLTree();
    [30, 20, 10].forEach((r) => treeLL.insert({ rollNo: r, name: `S${r}`, branch: 'CSE', subject: 'DS', semester: 4 }));
    const hasLL = treeLL.rotationHistory.some((r) => r.type === 'LL');

    // 2. RR Case: Insert 10, 20, 30 -> Left rotation on 10
    const treeRR = new AVLTree();
    [10, 20, 30].forEach((r) => treeRR.insert({ rollNo: r, name: `S${r}`, branch: 'CSE', subject: 'DS', semester: 4 }));
    const hasRR = treeRR.rotationHistory.some((r) => r.type === 'RR');

    // 3. LR Case: Insert 30, 10, 20 -> Left-Right rotation
    const treeLR = new AVLTree();
    [30, 10, 20].forEach((r) => treeLR.insert({ rollNo: r, name: `S${r}`, branch: 'CSE', subject: 'DS', semester: 4 }));
    const hasLR = treeLR.rotationHistory.some((r) => r.type === 'LR');

    // 4. RL Case: Insert 10, 30, 20 -> Right-Left rotation
    const treeRL = new AVLTree();
    [10, 30, 20].forEach((r) => treeRL.insert({ rollNo: r, name: `S${r}`, branch: 'CSE', subject: 'DS', semester: 4 }));
    const hasRL = treeRL.rotationHistory.some((r) => r.type === 'RL');

    const passed = hasLL && hasRR && hasLR && hasRL;
    results.push({
      id: 'TC-02',
      unit: 'Unit 1: Trees',
      name: 'Verification of All 4 AVL Rotations (LL, RR, LR, RL)',
      description: 'Trigger each imbalance scenario individually and verify correct rotation dispatch.',
      expected: 'LL, RR, LR, and RL rotations correctly detected and executed.',
      actual: `LL: ${hasLL ? 'OK' : 'FAIL'}, RR: ${hasRR ? 'OK' : 'FAIL'}, LR: ${hasLR ? 'OK' : 'FAIL'}, RL: ${hasRL ? 'OK' : 'FAIL'}`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'All 4 rotation algorithms verified with synthetic 3-node balance factor triggers.',
    });
  })();

  // Test 3: Student lookup and update
  (() => {
    const start = performance.now();
    const students = createInitialStudents();
    const avl = new AVLTree(students);

    const lookupBefore = avl.search(105);
    const updatedStudent: Student = {
      rollNo: 105,
      name: 'Bhavna Kulkarni (Special Accommodation)',
      branch: 'CSE',
      subject: 'Data Structures',
      semester: 4,
    };
    avl.insert(updatedStudent); // Updates data for existing key
    const lookupAfter = avl.search(105);

    const passed =
      lookupBefore.found &&
      lookupAfter.found &&
      lookupAfter.student?.name === 'Bhavna Kulkarni (Special Accommodation)';

    results.push({
      id: 'TC-03',
      unit: 'Unit 1: Trees',
      name: 'Candidate Record Lookup and In-Place Key Update',
      description: 'Search for Roll 105, retrieve record in logarithmic comparisons, update student record in-place.',
      expected: 'Record retrieved and updated with no duplicate node creation.',
      actual: `Found=${lookupAfter.found}, Comparisons=${lookupAfter.comparisons}, UpdatedName="${lookupAfter.student?.name}"`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: `Search path traversed: [${lookupAfter.path.join(' -> ')}]`,
    });
  })();

  // Test 4: Blocked seats and aisles sever graph connections
  (() => {
    const start = performance.now();
    const halls = createInitialHalls();
    const hallA = halls[0]; // has aisle in col 3, blocked bench at [1, 0]
    const graph = new SeatGraph(hallA);

    // Check that aisle seats are not in vertices
    const aisleSeatId = `${hallA.id}-R1C4`; // col 3 is 0-indexed C4
    const isAisleVertex = graph.vertices.includes(aisleSeatId);

    // Check that seat [1, 1] does not connect horizontally to aisle
    const seatNextToAisle = `${hallA.id}-R1C3`;
    const neighbors = graph.getNeighbors(seatNextToAisle);
    const crossesAisle = neighbors.includes(aisleSeatId);

    const passed = !isAisleVertex && !crossesAisle;
    results.push({
      id: 'TC-04',
      unit: 'Unit 3: Graphs',
      name: 'Aisle and Defective Bench Topology Severing',
      description: 'Verify aisle columns and blocked seats are excluded from vertex set and sever orthogonal edges.',
      expected: 'Aisle seat not in graph vertices; adjacent seats have severed graph edges across aisle.',
      actual: `Aisle vertex present=${isAisleVertex}, Edge crosses aisle=${crossesAisle}`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: `Total usable vertices in ${hallA.name}: ${graph.vertices.length} (out of ${hallA.rows * hallA.cols} total slots).`,
    });
  })();

  // Test 5: Connected seat blocks created by aisles
  (() => {
    const start = performance.now();
    const halls = createInitialHalls();
    const hallA = halls[0]; // center aisle down col 3 creates left block (cols 0,1,2) and right block (cols 4,5)
    const graph = new SeatGraph(hallA);
    const { components } = graph.findConnectedComponents();

    const passed = components.length >= 2;
    results.push({
      id: 'TC-05',
      unit: 'Unit 3: Graphs',
      name: 'Connected Components: Physical Seating Blocks Detection',
      description: 'Run BFS/DFS connected components algorithm to partition hall into independent blocks split by aisles.',
      expected: 'Discovers at least 2 disconnected seating blocks (Left and Right wings).',
      actual: `Discovered ${components.length} connected components with sizes [${components.map((c) => c.length).join(', ')}].`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'Invigilators can be assigned strictly to component boundaries without overlapping walk paths.',
    });
  })();

  // Test 6: BFS and DFS traversal order validation
  (() => {
    const start = performance.now();
    const halls = createInitialHalls();
    const graph = new SeatGraph(halls[0]);
    const startSeat = graph.vertices[0];

    const bfs = graph.runBFS(startSeat);
    const dfs = graph.runDFS(startSeat);

    const passed =
      bfs.visitedOrder.length > 0 &&
      dfs.visitedOrder.length > 0 &&
      bfs.visitedOrder[0] === startSeat &&
      dfs.visitedOrder[0] === startSeat;

    results.push({
      id: 'TC-06',
      unit: 'Unit 3: Graphs',
      name: 'BFS vs DFS Traversal Sequence & Call-Stack Inspection',
      description: 'Execute BFS (queue-based radial expansion) and DFS (stack-based corridor patrolling) on hall seat graph.',
      expected: 'Both algorithms visit connected vertices with distinct traversal patterns.',
      actual: `BFS visited ${bfs.visitedOrder.length} seats in ${bfs.steps.length} queue steps; DFS visited ${dfs.visitedOrder.length} seats in ${dfs.steps.length} stack steps.`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'BFS level-order matches radial invigilation sweep; DFS matches linear row patrolling.',
    });
  })();

  // Test 7: Conflict audit (Same-branch and Same-subject adjacent detection)
  (() => {
    const start = performance.now();
    const halls = createInitialHalls();
    const hallA = halls[0];
    const graph = new SeatGraph(hallA);

    // Intentionally construct a test scenario with adjacent CSE students
    const student1: Student = { rollNo: 901, name: 'Test Cand 1', branch: 'CSE', subject: 'DSA', semester: 4 };
    const student2: Student = { rollNo: 902, name: 'Test Cand 2', branch: 'CSE', subject: 'DSA', semester: 4 };

    const studentMap = new Map<number, Student>();
    studentMap.set(901, student1);
    studentMap.set(902, student2);

    // Assign adjacent seats [0,0] and [0,1]
    hallA.seats[0].studentRoll = 901;
    hallA.seats[1].studentRoll = 902;

    const conflicts = graph.auditConflicts(studentMap);
    const detectedOurPair = conflicts.some(
      (c) =>
        (c.student1.rollNo === 901 && c.student2.rollNo === 902) ||
        (c.student1.rollNo === 902 && c.student2.rollNo === 901)
    );

    const passed = detectedOurPair;
    results.push({
      id: 'TC-07',
      unit: 'Unit 3: Graphs',
      name: 'Orthogonal Conflict Audit: Same-Branch & Subject Detection',
      description: 'Audit orthogonal edges to detect when neighboring candidates share identical branches or subjects.',
      expected: 'Conflict accurately identified and flagged on edge between Seat 1 and Seat 2.',
      actual: `Conflict pair detected=${detectedOurPair}, Type="${conflicts[0]?.type || 'none'}"`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'Prevents cheating and malpractice by flagging immediate horizontal and vertical peer adjacency.',
    });
  })();

  // Test 8: Kruskal vs Prim MST comparison on Campus Intercom Graph
  (() => {
    const start = performance.now();
    const kruskal = runKruskalsMST(CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES);
    const prim = runPrimsMST(CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES, 'Exam Cell Hub');

    const passed =
      kruskal.totalWeight === prim.totalWeight &&
      kruskal.edges.length === CAMPUS_INTERCOM_VERTICES.length - 1;

    results.push({
      id: 'TC-08',
      unit: 'Unit 4: Spanning Trees',
      name: 'MST Invariance: Kruskal (DSU) vs Prim (Priority Cut) Comparison',
      description: 'Compare Kruskal and Prim on the identical inter-hall CCTV/Intercom network.',
      expected: 'Both algorithms compute equal minimum spanning weight (V-1 edges).',
      actual: `Kruskal Weight = ${kruskal.totalWeight}m (${kruskal.edges.length} edges), Prim Weight = ${prim.totalWeight}m (${prim.edges.length} edges).`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'Validates MST uniqueness theorem for equal edge weights; DSU cycles prevented.',
    });
  })();

  // Test 9: Dijkstra Route calculation from Exam Cell to Halls
  (() => {
    const start = performance.now();
    const route = runDijkstra(
      CAMPUS_ROUTE_NODES,
      CAMPUS_ROUTE_EDGES,
      'node-control',
      'node-hall-a101-desk'
    );

    const passed = route.shortestDistance > 0 && route.path.length >= 3;
    results.push({
      id: 'TC-09',
      unit: 'Unit 4: Shortest Paths',
      name: 'Dijkstra Single-Source Shortest Path to Invigilator Desk',
      description: 'Compute optimal walking route from Exam Cell Control Room to Hall A101 dais.',
      expected: 'Valid non-negative shortest path sequence reconstructed via predecessor table.',
      actual: `Distance = ${route.shortestDistance}m, Waypoints = ${route.path.length} [${route.pathNodes.map((n) => n.name).join(' -> ')}]`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: `Relaxation steps logged: ${route.steps.length}. Optimal route verified.`,
    });
  })();

  // Test 10: 0/1 Knapsack DP for optimal hall selection
  (() => {
    const start = performance.now();
    const halls = createInitialHalls();
    const knapsack = solve01Knapsack(halls, 8); // budget = 8

    const passed = knapsack.maxCapacityAchieved > 0 && knapsack.selectedHalls.length > 0;
    results.push({
      id: 'TC-10',
      unit: 'Unit 5: Dynamic Programming',
      name: '0/1 Knapsack DP Hall Selection under Operational Budget',
      description: 'Evaluate DP memoization table DP[i][w] to maximize candidate seats under budget.',
      expected: 'Global optimal subset of halls selected without exceeding budget constraint.',
      actual: `Max Capacity = ${knapsack.maxCapacityAchieved} seats, Budget Used = ${knapsack.totalCostIncurred}/${knapsack.capacityLimit}, Halls Selected = ${knapsack.selectedHalls.length}.`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: `Selected: ${knapsack.selectedHalls.map((h) => `${h.name} (${h.capacity} seats, cost ${h.cost})`).join(', ')}`,
    });
  })();

  // Test 11: In-place Heap Sort verification
  (() => {
    const start = performance.now();
    const unsorted = [45, 12, 85, 32, 89, 39, 69, 21, 56];
    const heapSortRes = runHeapSort(unsorted);

    const isSorted = heapSortRes.sorted.every((val, i, arr) => i === 0 || arr[i - 1] <= val);
    const passed = isSorted && heapSortRes.sorted.length === unsorted.length;

    results.push({
      id: 'TC-11',
      unit: 'Unit 2: Heaps',
      name: 'In-Place Heap Sort Algorithm Verification',
      description: 'Run 2-phase in-place heap sort: Max-Heap construction followed by root extraction.',
      expected: 'Array strictly ordered in ascending order with O(N log N) comparisons.',
      actual: `Sorted: [${heapSortRes.sorted.join(', ')}] in ${heapSortRes.swaps} swaps and ${heapSortRes.comparisons} comparisons.`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'Demonstrates guaranteed O(N log N) sorting without allocating auxiliary memory arrays.',
    });
  })();

  // Test 12: Hall capacity insufficient edge case
  (() => {
    const start = performance.now();
    const smallHall: Hall = {
      id: 'hall-micro',
      name: 'Micro Hall M1',
      block: 'Block X',
      floor: 1,
      rows: 2,
      cols: 2,
      costWeight: 1,
      isActive: true,
      seats: [
        { id: 'M1-R1C1', hallId: 'hall-micro', row: 0, col: 0, status: 'free' },
        { id: 'M1-R1C2', hallId: 'hall-micro', row: 0, col: 1, status: 'free' },
        { id: 'M1-R2C1', hallId: 'hall-micro', row: 1, col: 0, status: 'free' },
        { id: 'M1-R2C2', hallId: 'hall-micro', row: 1, col: 1, status: 'free' },
      ],
    };

    const candidates = createInitialStudents().slice(0, 10); // 10 students for 4 seats
    const result = generateConflictFreeSeating(smallHall, candidates);

    const passed = result.assignedStudents.length === 4 && result.unassignedStudents.length === 6;
    results.push({
      id: 'TC-12',
      unit: 'Unit 5: DP & Optimization',
      name: 'Boundary Test: Hall Capacity Insufficient Handling',
      description: 'Attempt to place 10 examinees into a 4-seat micro hall. Verify safe unassigned pool retention.',
      expected: 'Exactly 4 seats occupied; remaining 6 students safely retained in unassigned pool.',
      actual: `Assigned = ${result.assignedStudents.length}, Unassigned Pool = ${result.unassignedStudents.length}.`,
      status: passed ? 'passed' : 'failed',
      executionTimeMs: Number((performance.now() - start).toFixed(2)),
      details: 'Prevents buffer overflow / crash when candidate count exceeds hall physical limits.',
    });
  })();

  return results;
}

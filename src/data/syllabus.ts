/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyllabusTopic } from '../types';

export const SYLLABUS_TOPICS: SyllabusTopic[] = [
  // ================= UNIT 1: TREES & BALANCED SEARCH TREES =================
  {
    unit: 1,
    unitTitle: 'Unit 1: Trees & Balanced Search Trees',
    topicName: 'Binary Search Tree (BST) & Deletion',
    status: 'Implemented',
    locationInApp: 'Student Records > BST Inspector & Search',
    problemSolved: 'Stores and indexes candidate records keyed by unique roll number. Allows search, insertion, and deletion with in-order predecessor/successor replacement.',
    algorithmTriggered: 'BST.search(rollNo), BST.insert(student), BST.delete(rollNo)',
    timeComplexity: 'Average O(log N), Worst O(N) when skewed',
    spaceComplexity: 'O(N) node pointers',
    vivaExplanation: 'BST maintains the left-smaller, right-larger invariant. In-order deletion replaces a two-child node with its in-order successor to preserve ordering.',
    tradeoffOrLimitation: 'Without rebalancing, sequential insertions degrade tree height to O(N), degenerating search to linear time.'
  },
  {
    unit: 1,
    unitTitle: 'Unit 1: Trees & Balanced Search Trees',
    topicName: 'AVL Tree & Rotations (LL, RR, LR, RL)',
    status: 'Implemented',
    locationInApp: 'Student Records > AVL Visualizer & Rotations Lab',
    problemSolved: 'Enforces strict self-balancing via height balance factor BF = H(Left) - H(Right) in {-1, 0, 1}. Guarantees O(log N) lookup regardless of roll insertion order.',
    algorithmTriggered: 'AVLTree.insert(), rotateRight (LL), rotateLeft (RR), rotateLeftRight (LR), rotateRightLeft (RL)',
    timeComplexity: 'Guaranteed O(log N) Search, Insert, and Rebalance',
    spaceComplexity: 'O(N) with height overhead per node',
    vivaExplanation: 'When |BF| > 1, 4 rotation cases restore balance: single rotations (LL/RR) promote a direct child; double rotations (LR/RL) promote a grandchild.',
    tradeoffOrLimitation: 'Higher insertion and deletion overhead due to continuous balance factor updates and pointer swaps compared to regular BST.'
  },
  {
    unit: 1,
    unitTitle: 'Unit 1: Trees & Balanced Search Trees',
    topicName: 'Tree Traversals (Inorder, Preorder, Postorder)',
    status: 'Implemented',
    locationInApp: 'Student Records > Traversal Output Panel',
    problemSolved: 'Inorder traversal yields strictly sorted roll numbers for official hall attendance registers; preorder enables tree cloning and backup.',
    algorithmTriggered: 'BST.inOrderTraversal(), preOrderTraversal(), postOrderTraversal()',
    timeComplexity: 'O(N) visits every student node exactly once',
    spaceComplexity: 'O(H) recursion stack where H is tree height',
    vivaExplanation: 'Inorder (Left-Root-Right) leverages BST binary search property to retrieve sorted sequence without external sorting.',
    tradeoffOrLimitation: 'Recursive traversal incurs O(H) auxiliary call-stack memory overhead.'
  },
  {
    unit: 1,
    unitTitle: 'Unit 1: Trees & Balanced Search Trees',
    topicName: 'Threaded Binary Tree (TBT)',
    status: 'Demonstrated',
    locationInApp: 'Student Records > TBT Educational Model',
    problemSolved: 'Demonstrates stack-less in-order traversal by replacing null right pointers with threads pointing directly to in-order successors.',
    algorithmTriggered: 'ThreadedBinaryTree.inorderTraversalWithTrace()',
    timeComplexity: 'O(N) traversal time',
    spaceComplexity: 'O(1) auxiliary space (no recursion stack)',
    vivaExplanation: 'Standard binary trees waste ~50% of pointers as NULL. TBT reclaims null right pointers to point to in-order successors for O(1) space traversal.',
    tradeoffOrLimitation: 'Insertions and deletions require intricate pointer updates to maintain thread tags.'
  },
  {
    unit: 1,
    unitTitle: 'Unit 1: Trees & Balanced Search Trees',
    topicName: 'Tree Representations (Dynamic Pointers vs Array)',
    status: 'Demonstrated',
    locationInApp: 'Student Records > Tree Representation Comparison',
    problemSolved: 'Compares dynamic reference node linking against sequential array index mapping [2i+1, 2i+2] for sparse vs complete trees.',
    algorithmTriggered: 'Visual comparison diagram and memory footprint estimator',
    timeComplexity: 'Pointer: O(1) access; Array: O(1) formulaic index arithmetic',
    spaceComplexity: 'Pointer: 3 words/node; Array: up to 2^H - 1 slots',
    vivaExplanation: 'Dynamic linked nodes are optimal for dynamic insertion of student records; array representation wastes memory on sparse or unbalanced trees.',
    tradeoffOrLimitation: 'Cache locality is worse in pointer-linked structures compared to contiguous arrays.'
  },

  // ================= UNIT 2: PRIORITY QUEUES & HEAPS =================
  {
    unit: 2,
    unitTitle: 'Unit 2: Priority Queues & Heaps',
    topicName: 'Binary Max/Min Heap',
    status: 'Implemented',
    locationInApp: 'Halls & Allocation > Hall Priority Selector',
    problemSolved: 'Maintains examination halls ordered by usable capacity or cost efficiency with logarithmic extraction and insertion.',
    algorithmTriggered: 'BinaryHeap.insert(), extract(), heapifyUp(), heapifyDown()',
    timeComplexity: 'O(log M) insert/extract, O(1) peek, where M = hall count',
    spaceComplexity: 'O(M) contiguous array',
    vivaExplanation: 'A complete binary tree satisfying heap property (parent >= child for Max-Heap). Implemented efficiently using array indexes [2i+1, 2i+2].',
    tradeoffOrLimitation: 'Searching for an arbitrary element inside a heap takes O(N) linear time since left and right child relationships are not ordered.'
  },
  {
    unit: 2,
    unitTitle: 'Unit 2: Priority Queues & Heaps',
    topicName: 'Priority Queue for Hall Allocation',
    status: 'Implemented',
    locationInApp: 'Halls & Allocation > Hall Selection Policies',
    problemSolved: 'Enforces exam cell policies: "Largest Hall First" (Max-Heap) vs "Smallest Suitable Hall First" (Min-Heap) vs "Lowest Cost First".',
    algorithmTriggered: 'PriorityQueue.extract() to serve candidates sequentially',
    timeComplexity: 'O(M log M) to dispatch all halls',
    spaceComplexity: 'O(M) memory',
    vivaExplanation: 'Extracts the most suitable venue dynamically as batches of examinees arrive, updating remaining hall seats in logarithmic steps.',
    tradeoffOrLimitation: 'Greedy priority allocation might leave suboptimal capacity fragments compared to global Dynamic Programming.'
  },
  {
    unit: 2,
    unitTitle: 'Unit 2: Priority Queues & Heaps',
    topicName: 'Heap Sort',
    status: 'Implemented',
    locationInApp: 'Halls & Allocation > In-Place Heap Sort Lab',
    problemSolved: 'Sorts candidate batch counts or hall capacities in-place with guaranteed O(N log N) worst-case time without extra array allocation.',
    algorithmTriggered: 'runHeapSort(capacities)',
    timeComplexity: 'Guaranteed O(N log N) Best, Average, and Worst case',
    spaceComplexity: 'O(1) auxiliary space (in-place swaps)',
    vivaExplanation: 'Phase 1 builds a Max-Heap in O(N) using bottom-up heapify. Phase 2 repeatedly swaps root with end and heapifies down in O(N log N).',
    tradeoffOrLimitation: 'Heap sort is not a stable sort and has poor CPU cache locality compared to QuickSort.'
  },

  // ================= UNIT 3: GRAPH BASICS & TRAVERSALS =================
  {
    unit: 3,
    unitTitle: 'Unit 3: Graph Basics & Traversals',
    topicName: 'Adjacency List Representation',
    status: 'Implemented',
    locationInApp: 'Halls & Seats > Seat Graph Inspector',
    problemSolved: 'Models examination hall seating where each usable seat is a vertex, connected to orthogonal neighbors (left, right, front, back).',
    algorithmTriggered: 'SeatGraph.adjacencyList construction',
    timeComplexity: 'O(V + E) creation and neighbor querying',
    spaceComplexity: 'O(V + E) compact memory, skips aisles and blocked benches',
    vivaExplanation: 'Each seat only has up to 4 orthogonal physical neighbors. Adjacency list avoids storing massive empty zeroes for non-adjacent seats.',
    tradeoffOrLimitation: 'Checking if an edge exists between two arbitrary seats requires O(degree) list traversal instead of O(1).'
  },
  {
    unit: 3,
    unitTitle: 'Unit 3: Graph Basics & Traversals',
    topicName: 'Adjacency Matrix Representation',
    status: 'Demonstrated',
    locationInApp: 'Halls & Seats > Matrix vs List Tradeoff Lab',
    problemSolved: 'Generates a V x V binary matrix of seat interactions and demonstrates quadratic space overhead compared to sparse adjacency list.',
    algorithmTriggered: 'SeatGraph.getAdjacencyMatrix()',
    timeComplexity: 'O(V^2) space and matrix population time',
    spaceComplexity: 'O(V^2) memory (inefficient for large auditoriums)',
    vivaExplanation: 'Adjacency matrix allows O(1) edge lookup but wastes V^2 memory on planar seat grids where average degree is at most 4.',
    tradeoffOrLimitation: 'For an exam auditorium with 300 seats, matrix requires 90,000 cells compared to ~1,200 entries in adjacency list.'
  },
  {
    unit: 3,
    unitTitle: 'Unit 3: Graph Basics & Traversals',
    topicName: 'Breadth-First Search (BFS)',
    status: 'Implemented',
    locationInApp: 'Conflict Audit & Graph > Interactive BFS Traversal',
    problemSolved: 'Simulates radial invigilation sweeps expanding outward from invigilator desk level by level; checks radial proximity conflicts.',
    algorithmTriggered: 'SeatGraph.runBFS(startSeatId)',
    timeComplexity: 'O(V + E) queue-based level order traversal',
    spaceComplexity: 'O(V) queue and visited set',
    vivaExplanation: 'BFS uses a FIFO queue to visit all direct orthogonal neighbors before venturing further, guaranteeing shortest unweighted step distance.',
    tradeoffOrLimitation: 'Requires memory proportional to the maximum breadth (width of exam hall grid) in queue.'
  },
  {
    unit: 3,
    unitTitle: 'Unit 3: Graph Basics & Traversals',
    topicName: 'Depth-First Search (DFS)',
    status: 'Implemented',
    locationInApp: 'Conflict Audit & Graph > Interactive DFS Traversal',
    problemSolved: 'Simulates invigilator row-by-row corridor patrolling along snake-like column paths to check student desk IDs.',
    algorithmTriggered: 'SeatGraph.runDFS(startSeatId)',
    timeComplexity: 'O(V + E) stack-based traversal',
    spaceComplexity: 'O(V) call-stack / explicit stack memory',
    vivaExplanation: 'DFS explores as deep as possible along a seating row before backtracking, ideal for continuous corridor patrolling simulations.',
    tradeoffOrLimitation: 'Does not find the shortest path in unweighted graphs and can take long meandering paths across the hall.'
  },
  {
    unit: 3,
    unitTitle: 'Unit 3: Graph Basics & Traversals',
    topicName: 'Connected Components',
    status: 'Implemented',
    locationInApp: 'Halls & Seats > Seat Block Segmentation',
    problemSolved: 'Identifies naturally disconnected seating blocks split by central walking aisles or emergency exits to assign invigilator zones.',
    algorithmTriggered: 'SeatGraph.findConnectedComponents()',
    timeComplexity: 'O(V + E) disjoint partition traversal',
    spaceComplexity: 'O(V) component ID mapping',
    vivaExplanation: 'When central walking aisles have status "aisle", graph edges are not formed across them, partitioning the hall into separate connected subgraphs.',
    tradeoffOrLimitation: 'Only accounts for topological connectivity; does not enforce physical symmetry of seat blocks.'
  },

  // ================= UNIT 4: ADVANCED GRAPHS (SPANNING TREES & SHORTEST PATHS) =================
  {
    unit: 4,
    unitTitle: 'Unit 4: Spanning Trees & Shortest Paths',
    topicName: "Kruskal's Algorithm (Minimum Spanning Tree)",
    status: 'Implemented',
    locationInApp: 'Invigilation & Routing > Inter-Hall Network MST',
    problemSolved: 'Designs the minimal cost CCTV, emergency intercom, and exam-bell cabling infrastructure linking all campus examination venues without cycles.',
    algorithmTriggered: 'runKruskalsMST(vertices, edges) with DisjointSet',
    timeComplexity: 'O(E log E) edge sorting + O(E * alpha(V)) DSU unions',
    spaceComplexity: 'O(V + E) for DSU parent/rank arrays',
    vivaExplanation: 'Greedy algorithm that sorts all network conduits by distance and adds the shortest edge if its endpoints belong to different disjoint sets.',
    tradeoffOrLimitation: 'Must sort all campus edges upfront; slower on dense graphs compared to Prim with Fibonacci heap.'
  },
  {
    unit: 4,
    unitTitle: 'Unit 4: Spanning Trees & Shortest Paths',
    topicName: "Prim's Algorithm (Minimum Spanning Tree)",
    status: 'Implemented',
    locationInApp: 'Invigilation & Routing > Kruskal vs Prim Comparison',
    problemSolved: 'Alternative MST construction growing the inter-hall network outward from the Central Exam Cell Hub seed node.',
    algorithmTriggered: 'runPrimsMST(vertices, edges, "Exam Cell Hub")',
    timeComplexity: 'O(V^2) or O(E log V) with Priority Queue',
    spaceComplexity: 'O(V + E) adjacency tracking',
    vivaExplanation: 'Maintains a growing tree of visited venues and greedily selects the minimum weight cut edge connecting a visited to an unvisited venue.',
    tradeoffOrLimitation: 'Requires a connected graph to span all venues; disconnected nodes remain unreached.'
  },
  {
    unit: 4,
    unitTitle: 'Unit 4: Spanning Trees & Shortest Paths',
    topicName: "Dijkstra's Algorithm (Single-Source Shortest Path)",
    status: 'Implemented',
    locationInApp: 'Invigilation & Routing > Rapid Invigilation Route Planner',
    problemSolved: 'Calculates the fastest route and exact walking distance from Central Exam Cell / Entrance to any examination hall, door, or seat block.',
    algorithmTriggered: 'runDijkstra(nodes, edges, source, target)',
    timeComplexity: 'O((V + E) log V) with Priority Queue',
    spaceComplexity: 'O(V) distance and predecessor tables',
    vivaExplanation: 'Greedily relaxes tentative distances using edge weights. Guarantees optimal path because campus walkway distances are strictly non-negative.',
    tradeoffOrLimitation: 'Fails with negative edge weights (not applicable to real physical distances); computes single-source only.'
  },
  {
    unit: 4,
    unitTitle: 'Unit 4: Spanning Trees & Shortest Paths',
    topicName: 'Bellman-Ford & Floyd-Warshall (All-Pairs Shortest Path)',
    status: 'Not Used',
    locationInApp: 'DSA Coverage > Syllabus Verification Notice',
    problemSolved: 'Not needed for physical campus navigation since physical walking distances are strictly positive and invigilators navigate from a single control point.',
    algorithmTriggered: 'Not triggered in exam seating workflow',
    timeComplexity: 'Bellman-Ford: O(V * E); Floyd-Warshall: O(V^3)',
    spaceComplexity: 'O(V^2) for Floyd-Warshall all-pairs distance matrix',
    vivaExplanation: 'Bellman-Ford supports negative weights (irrelevant in physical distances) and Floyd-Warshall has excessive O(V^3) overhead for single-source dispatch.',
    tradeoffOrLimitation: 'O(V^3) cubic time is computationally wasteful when Dijkstra solves single-source navigation in sub-second time.'
  },
  {
    unit: 4,
    unitTitle: 'Unit 4: Spanning Trees & Shortest Paths',
    topicName: 'Topological Sort (DAG Task Scheduling)',
    status: 'Demonstrated',
    locationInApp: 'DSA Coverage > Exam Workflow Dependency DAG',
    problemSolved: 'Models pre-exam administrative task dependencies (Hall Sanitization -> Question Paper Printing -> Seating Chart Pasting -> Candidate Entry -> Exam Start).',
    algorithmTriggered: 'Topological Sort DAG visual dependency flow',
    timeComplexity: 'O(V + E) via in-degree Kahn algorithm or DFS',
    spaceComplexity: 'O(V) dependency list',
    vivaExplanation: 'Orders exam operational milestones such that for every directed dependency (u -> v), administrative task u completes before task v starts.',
    tradeoffOrLimitation: 'Cannot schedule processes containing circular prerequisite cycles.'
  },

  // ================= UNIT 5: DYNAMIC PROGRAMMING & OPTIMIZATION =================
  {
    unit: 5,
    unitTitle: 'Unit 5: Dynamic Programming & Optimization',
    topicName: '0/1 Knapsack Dynamic Programming',
    status: 'Implemented',
    locationInApp: 'Dynamic Programming > 0/1 Knapsack Hall Selector',
    problemSolved: 'Selects the optimal subset of examination halls under operational budget constraint (AC power, invigilators) to maximize candidate seating capacity.',
    algorithmTriggered: 'solve01Knapsack(halls, capacityBudget)',
    timeComplexity: 'O(N * W) pseudo-polynomial time, where N = halls, W = budget',
    spaceComplexity: 'O(N * W) 2D memoization state matrix',
    vivaExplanation: 'Optimal substructure and overlapping subproblems: DP[i][w] = max(exclude, include) builds global optimum from smaller sub-budgets.',
    tradeoffOrLimitation: 'Requires integer budget weights; pseudo-polynomial time grows if budget constraint scale is very large.'
  },
  {
    unit: 5,
    unitTitle: 'Unit 5: Dynamic Programming & Optimization',
    topicName: 'Multi-Stage Resource Allocation DP',
    status: 'Implemented',
    locationInApp: 'Dynamic Programming > Multi-Stage Branch Allocation',
    problemSolved: 'Partitions diverse candidate cohorts across halls to balance branch diversity, preventing single-branch dominance and reducing cheating probability.',
    algorithmTriggered: 'allocateStudentsAcrossHalls(students, halls)',
    timeComplexity: 'O(H * B) where H = halls, B = branch count',
    spaceComplexity: 'O(H * B) allocation matrix',
    vivaExplanation: 'Multi-stage decision process where each stage allocates candidate quotas to minimize variance in branch density across rooms.',
    tradeoffOrLimitation: 'Strict integer quota rounding can leave small capacity differences between rooms.'
  },
  {
    unit: 5,
    unitTitle: 'Unit 5: Dynamic Programming & Optimization',
    topicName: 'Backtracking / Constraint Satisfaction Problem (CSP)',
    status: 'Implemented',
    locationInApp: 'Seating Plan > Conflict-Aware Grid Generator',
    problemSolved: 'Assigns candidates to individual seats such that no two adjacent orthogonal seats share the same academic branch or subject.',
    algorithmTriggered: 'generateConflictFreeSeating(hall, candidates)',
    timeComplexity: 'O(R * C * K) where R,C = grid dimensions, K = pool size',
    spaceComplexity: 'O(R * C) seat state buffer',
    vivaExplanation: 'Tests candidate assignment against active orthogonal graph constraints (top, left, right, bottom); backtracks or substitutes if conflict occurs.',
    tradeoffOrLimitation: 'If a single branch constitutes > 50% of the candidate population, mathematical pigeonhole principle guarantees conflict cannot be zero.'
  },
  {
    unit: 5,
    unitTitle: 'Unit 5: Dynamic Programming & Optimization',
    topicName: 'Matrix Chain Multiplication & LCS',
    status: 'Not Used',
    locationInApp: 'DSA Coverage > Syllabus Verification Notice',
    problemSolved: 'Standard syllabus DP topics that do not map to spatial exam seating or student roll distribution; omitted to preserve operational authenticity.',
    algorithmTriggered: 'Not applicable to examination hall operations',
    timeComplexity: 'MCM: O(N^3); LCS: O(N * M)',
    spaceComplexity: 'O(N^2) / O(N * M) DP tables',
    vivaExplanation: 'Matrix Chain Multiplication optimizes matrix parenthesization and LCS computes text sequence alignments, neither of which occurs in hall allocation.',
    tradeoffOrLimitation: 'Including non-operational algorithms would violate the real-world administrative focus of the examination system.'
  }
];

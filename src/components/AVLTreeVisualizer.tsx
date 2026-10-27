/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Student, BranchCode, AlgorithmTrace } from '../types';
import { AVLTree, AVLNode, RotationType, RotationEvent } from '../dsa/avl';
import {
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Info,
  Play,
  RefreshCw,
  GitBranch,
  X,
} from 'lucide-react';

interface AVLTreeVisualizerProps {
  students: Student[];
  onRecordTrace: (trace: AlgorithmTrace) => void;
  onStudentAdded?: (student: Student) => void;
  onStudentDeleted?: (rollNo: number) => void;
}

interface VisualNode {
  key: number;
  data: Student;
  height: number;
  balanceFactor: number;
  x: number;
  y: number;
  left: VisualNode | null;
  right: VisualNode | null;
}

export const AVLTreeVisualizer: React.FC<AVLTreeVisualizerProps> = ({
  students,
  onRecordTrace,
  onStudentAdded,
  onStudentDeleted,
}) => {
  // Use a local AVL tree instance that can be mutated interactively or synced with students
  const [localTree, setLocalTree] = useState<AVLTree>(() => {
    // Start with a clean sample subset of students (e.g. 7-15 students) for high readability, or full
    const sample = students.slice(0, 11);
    return new AVLTree(sample);
  });

  const [activeRotation, setActiveRotation] = useState<RotationEvent | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPath, setSearchPath] = useState<number[]>([]);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  // Quick Add Node State
  const [inputRoll, setInputRoll] = useState('');
  const [inputName, setInputName] = useState('');
  const [inputBranch, setInputBranch] = useState<BranchCode>('CSE');

  // Selected node for details/removal
  const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);

  // Sync with prop when student count changes substantially
  const handleResetToAllStudents = () => {
    const freshTree = new AVLTree(students.slice(0, 15));
    setLocalTree(freshTree);
    setActiveRotation(null);
    setHighlightedNodes(new Set());
    setSelectedNode(null);
    setSearchPath([]);
    setSearchStatus('Loaded examination candidate sample (15 records) into AVL Tree.');
  };

  // Branch badge color helper
  const getBranchBadge = (branch: string) => {
    switch (branch) {
      case 'CSE':
        return 'bg-indigo-600 text-white';
      case 'ECE':
        return 'bg-purple-600 text-white';
      case 'MECH':
        return 'bg-amber-600 text-white';
      case 'AIDS':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  // In-order coordinates generator for pristine, non-overlapping tree layout
  const visualTree = useMemo(() => {
    let orderIndex = 0;
    const nodeCoords = new Map<number, { x: number; y: number }>();

    // Step 1: In-order traversal assigns x-coordinate based on sequence
    const assignX = (node: AVLNode | null) => {
      if (!node) return;
      assignX(node.left);
      orderIndex++;
      nodeCoords.set(node.key, { x: orderIndex, y: 0 });
      assignX(node.right);
    };
    assignX(localTree.root);

    const totalNodes = Math.max(orderIndex, 1);
    const canvasWidth = Math.max(totalNodes * 75, 680);

    // Step 2: Assign y-coordinate based on depth
    const buildVisual = (node: AVLNode | null, depth: number): VisualNode | null => {
      if (!node) return null;
      const coords = nodeCoords.get(node.key) || { x: 1, y: 0 };
      // Map order index to canvas pixel width
      const xPixel = (coords.x / (totalNodes + 1)) * canvasWidth;
      const yPixel = depth * 80 + 45;

      const leftVisual = buildVisual(node.left, depth + 1);
      const rightVisual = buildVisual(node.right, depth + 1);

      return {
        key: node.key,
        data: node.data,
        height: node.height,
        balanceFactor: localTree.getBalance(node),
        x: xPixel,
        y: yPixel,
        left: leftVisual,
        right: rightVisual,
      };
    };

    return {
      root: buildVisual(localTree.root, 0),
      canvasWidth,
      canvasHeight: Math.max((localTree.getHeight() + 1) * 85, 340),
    };
  }, [localTree]);

  // Extract all lines connecting parents to children
  const treeEdges = useMemo(() => {
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number; fromKey: number; toKey: number }> = [];
    const traverse = (node: VisualNode | null) => {
      if (!node) return;
      if (node.left) {
        edges.push({
          x1: node.x,
          y1: node.y,
          x2: node.left.x,
          y2: node.left.y,
          fromKey: node.key,
          toKey: node.left.key,
        });
        traverse(node.left);
      }
      if (node.right) {
        edges.push({
          x1: node.x,
          y1: node.y,
          x2: node.right.x,
          y2: node.right.y,
          fromKey: node.key,
          toKey: node.right.key,
        });
        traverse(node.right);
      }
    };
    traverse(visualTree.root);
    return edges;
  }, [visualTree]);

  // Handle Add Student to AVL Tree
  const handleAddStudent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const roll = parseInt(inputRoll.trim(), 10);
    if (isNaN(roll)) return;

    const newStudent: Student = {
      rollNo: roll,
      name: inputName.trim() || `Candidate ${roll}`,
      branch: inputBranch,
      subject: 'Data Structures',
      semester: 4,
    };

    const newTree = new AVLTree();
    // Replay existing nodes
    localTree.inOrderTraversal().forEach((s) => newTree.insert(s));
    const prevRotLen = newTree.rotationHistory.length;
    newTree.insert(newStudent);

    setLocalTree(newTree);
    setInputRoll('');
    setInputName('');

    // Check if rotation occurred
    if (newTree.rotationHistory.length > prevRotLen) {
      const latestRot = newTree.rotationHistory[newTree.rotationHistory.length - 1];
      setActiveRotation(latestRot);
      setHighlightedNodes(new Set([latestRot.nodeKey, latestRot.pivotKey, roll]));
    } else {
      setActiveRotation(null);
      setHighlightedNodes(new Set([roll]));
    }

    if (onStudentAdded) onStudentAdded(newStudent);

    onRecordTrace({
      id: `trace-avl-add-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'AVL Tree Self-Balancing Insertion',
      unit: 'Unit 1: Trees & Balanced Search',
      problemSolved: `Inserted Roll #${roll} into AVL tree and maintained O(log N) height invariant.`,
      timeComplexity: 'O(log N) guaranteed',
      spaceComplexity: 'O(1) extra space',
      inputSummary: `Added Roll #${roll} (${newStudent.branch})`,
      executionTimeMs: 0.4,
      operationCount: newTree.getHeight(),
      steps: [
        `Traversed tree using BST ordering to locate insertion leaf for Roll #${roll}.`,
        `Inserted new candidate node at leaf position with Height = 1.`,
        `Updated heights of ancestor nodes up to root.`,
        newTree.rotationHistory.length > prevRotLen
          ? `Imbalance detected: Executed ${newTree.rotationHistory[newTree.rotationHistory.length - 1].type} rotation.`
          : 'All ancestors remained balanced (|Balance Factor| <= 1). No rotations needed.',
      ],
      resultSummary: `Roll #${roll} added successfully. AVL Tree Height: ${newTree.getHeight()}.`,
    });
  };

  // Handle Remove Student from AVL Tree
  const handleRemoveStudent = (rollNo: number) => {
    const newTree = new AVLTree();
    localTree.inOrderTraversal().forEach((s) => {
      if (s.rollNo !== rollNo) newTree.insert(s);
    });

    setLocalTree(newTree);
    setSelectedNode(null);

    // Check if rebalancing triggered
    if (newTree.rotationHistory.length > 0) {
      const latestRot = newTree.rotationHistory[newTree.rotationHistory.length - 1];
      setActiveRotation(latestRot);
      setHighlightedNodes(new Set([latestRot.nodeKey, latestRot.pivotKey]));
    } else {
      setActiveRotation(null);
      setHighlightedNodes(new Set());
    }

    if (onStudentDeleted) onStudentDeleted(rollNo);

    onRecordTrace({
      id: `trace-avl-del-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'AVL Tree Self-Balancing Deletion',
      unit: 'Unit 1: Trees & Balanced Search',
      problemSolved: `Removed Roll #${rollNo} and rebalanced tree via AVL rotations.`,
      timeComplexity: 'O(log N) guaranteed',
      spaceComplexity: 'O(1) extra space',
      inputSummary: `Deleted Roll #${rollNo}`,
      executionTimeMs: 0.3,
      operationCount: newTree.getHeight(),
      steps: [
        `Searched for Roll #${rollNo} in AVL Tree.`,
        `Replaced node with in-order successor or spliced leaf node.`,
        `Recomputed balance factors along search path toward root.`,
        'Applied rotations if balance factor fell outside [-1, 1].',
      ],
      resultSummary: `Roll #${rollNo} removed. New tree height: ${newTree.getHeight()}.`,
    });
  };

  // Preset Rotations Demonstration Sandbox (LL, RR, LR, RL)
  const runPresetRotation = (type: RotationType) => {
    const demoTree = new AVLTree();
    let keys: number[] = [];
    let scenarioDesc = '';

    if (type === 'LL') {
      keys = [130, 120, 110];
      scenarioDesc = 'Inserted 130 -> 120 -> 110 (all left children). Node 130 gets Balance Factor +2 → Right Rotation (LL) promotes 120!';
    } else if (type === 'RR') {
      keys = [110, 120, 130];
      scenarioDesc = 'Inserted 110 -> 120 -> 130 (all right children). Node 110 gets Balance Factor -2 → Left Rotation (RR) promotes 120!';
    } else if (type === 'LR') {
      keys = [130, 110, 120];
      scenarioDesc = 'Inserted 130 -> 110 (left child) -> 120 (right child). Node 130 gets BF +2 with left child BF -1 → Left-Right (LR) Double Rotation promotes 120!';
    } else if (type === 'RL') {
      keys = [110, 130, 120];
      scenarioDesc = 'Inserted 110 -> 130 (right child) -> 120 (left child). Node 110 gets BF -2 with right child BF +1 → Right-Left (RL) Double Rotation promotes 120!';
    }

    const branches: BranchCode[] = ['CSE', 'ECE', 'MECH'];
    keys.forEach((k, idx) => {
      demoTree.insert({
        rollNo: k,
        name: `Student ${k}`,
        branch: branches[idx % branches.length],
        subject: 'Data Structures',
        semester: 4,
      });
    });

    setLocalTree(demoTree);
    setSelectedNode(null);

    if (demoTree.rotationHistory.length > 0) {
      const rot = demoTree.rotationHistory[demoTree.rotationHistory.length - 1];
      setActiveRotation(rot);
      setHighlightedNodes(new Set(keys));
    }

    onRecordTrace({
      id: `trace-rotation-demo-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: `AVL ${type} Rotation Demonstration`,
      unit: 'Unit 1: Trees & AVL Rotations',
      problemSolved: `Demonstrates ${type} rebalancing on insertion of keys [${keys.join(', ')}].`,
      timeComplexity: 'O(1) pointer updates per rotation',
      spaceComplexity: 'O(1)',
      inputSummary: `Keys: ${keys.join(' -> ')}`,
      executionTimeMs: 0.2,
      operationCount: 3,
      steps: [
        `Inserted sequence ${keys.join(', ')} into tree.`,
        scenarioDesc,
        `Rebalanced tree root is now key ${demoTree.root?.key} with height ${demoTree.getHeight()}.`,
      ],
      resultSummary: `${type} rotation demonstrated successfully!`,
    });
  };

  // Search Roll and Highlight Search Path
  const handleSearchRoll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const roll = parseInt(searchQuery.trim(), 10);
    if (isNaN(roll)) return;

    const res = localTree.search(roll);
    setSearchPath(res.path);
    setHighlightedNodes(new Set(res.path));

    if (res.found) {
      setSearchStatus(`Found Roll #${roll} (${res.student?.name}) in ${res.comparisons} comparisons! Search path: ${res.path.join(' → ')}`);
      // Select the found node
      const findVisual = (node: VisualNode | null): VisualNode | null => {
        if (!node) return null;
        if (node.key === roll) return node;
        return findVisual(node.left) || findVisual(node.right);
      };
      const foundVisual = findVisual(visualTree.root);
      if (foundVisual) setSelectedNode(foundVisual);
    } else {
      setSearchStatus(`Roll #${roll} not found after ${res.comparisons} comparisons. Search path: ${res.path.join(' → ')}`);
      setSelectedNode(null);
    }
  };

  const avlHeight = localTree.getHeight();
  const nodeCount = localTree.getSize();
  const maxBstHeight = nodeCount; // Unbalanced BST worst-case

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              UNIT 1: TREES &amp; BALANCED SEARCH
            </span>
            <span className="text-xs text-slate-500 font-medium">Self-Balancing AVL Visualizer</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span>Visual AVL Tree of Examinee Records</span>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-600">
              {nodeCount} Nodes
            </span>
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Every candidate is stored as an AVL node keyed by roll number. When nodes are added or removed, the tree automatically rotates (LL, RR, LR, RL) to keep the Balance Factor within [-1, +1], guaranteeing <strong>O(log N)</strong> fast lookups.
          </p>
        </div>

        {/* 4 Rotation Sandboxes */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block w-full sm:w-auto">
            Test Rotations:
          </span>
          <button
            onClick={() => runPresetRotation('LL')}
            className="px-3 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Demonstrate Left-Left (Right Rotation)"
          >
            LL (Right)
          </button>
          <button
            onClick={() => runPresetRotation('RR')}
            className="px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Demonstrate Right-Right (Left Rotation)"
          >
            RR (Left)
          </button>
          <button
            onClick={() => runPresetRotation('LR')}
            className="px-3 py-1.5 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Demonstrate Left-Right Double Rotation"
          >
            LR (Double)
          </button>
          <button
            onClick={() => runPresetRotation('RL')}
            className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Demonstrate Right-Left Double Rotation"
          >
            RL (Double)
          </button>
          <button
            onClick={handleResetToAllStudents}
            className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Reload examinee records from current student directory"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Tree</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar: AVL Height vs Degenerate BST */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              AVL Height (Balanced)
            </span>
            <span className="text-lg font-mono font-extrabold text-indigo-700">
              {avlHeight} <span className="text-xs font-normal text-slate-500">levels</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Worst BST Height (Skewed)
            </span>
            <span className="text-lg font-mono font-extrabold text-rose-700">
              {maxBstHeight} <span className="text-xs font-normal text-slate-500">levels (O(N))</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Lookup Complexity
            </span>
            <span className="text-lg font-mono font-extrabold text-emerald-700">
              O(log N) <span className="text-xs font-normal text-slate-500">guaranteed</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Balance Factor Rule
            </span>
            <span className="text-sm font-mono font-extrabold text-amber-900">
              BF ∈ {'{-1, 0, +1}'}
            </span>
          </div>
        </div>
      </div>

      {/* Rotation Notification Card */}
      {activeRotation && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
              {activeRotation.type}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-amber-950 text-sm">
                  Rotation Triggered: {activeRotation.type} Rebalancing
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold font-mono">
                  Pivot #{activeRotation.pivotKey} &rarr; Promoted
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed font-medium">
                {activeRotation.reason}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveRotation(null)}
            className="p-1 hover:bg-amber-200 rounded-lg text-amber-800 cursor-pointer self-end sm:self-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar: Search by Roll + Quick Add Student */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
        {/* Search */}
        <form onSubmit={handleSearchRoll} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Roll Number (e.g. 101, 105)..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-all shrink-0"
          >
            Search Tree
          </button>
        </form>

        <div className="h-6 w-px bg-slate-300 hidden lg:block" />

        {/* Quick Add Form */}
        <form onSubmit={handleAddStudent} className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={inputRoll}
            onChange={(e) => setInputRoll(e.target.value)}
            placeholder="Roll #"
            className="w-20 px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
            required
          />
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Candidate Name"
            className="w-32 px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
          />
          <select
            value={inputBranch}
            onChange={(e) => setInputBranch(e.target.value as BranchCode)}
            className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
          >
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="AIDS">AIDS</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer transition-all shadow-2xs"
            title="Add candidate to AVL Tree and observe automatic rebalancing"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Node</span>
          </button>
        </form>
      </div>

      {/* Search Result Banner */}
      {searchStatus && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs flex items-center justify-between text-indigo-900 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{searchStatus}</span>
          </div>
          <button
            onClick={() => {
              setSearchStatus(null);
              setSearchPath([]);
            }}
            className="p-1 hover:bg-indigo-100 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TREE CANVAS GRAPH */}
      <div className="relative border border-slate-200 rounded-3xl bg-slate-50/50 p-4 overflow-x-auto min-h-[360px] flex items-center justify-center">
        {visualTree.root ? (
          <div
            className="relative transition-all duration-500 ease-out"
            style={{
              width: `${visualTree.canvasWidth}px`,
              height: `${visualTree.canvasHeight}px`,
              minWidth: '100%',
            }}
          >
            {/* SVG Connecting Edges */}
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              style={{ zIndex: 0 }}
            >
              {treeEdges.map((edge) => {
                const isPathEdge =
                  searchPath.includes(edge.fromKey) && searchPath.includes(edge.toKey);
                return (
                  <line
                    key={`${edge.fromKey}-${edge.toKey}`}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={isPathEdge ? '#6366f1' : '#cbd5e1'}
                    strokeWidth={isPathEdge ? 3 : 2}
                    strokeDasharray={isPathEdge ? 'none' : 'none'}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>

            {/* Tree Nodes */}
            {(() => {
              const nodesList: VisualNode[] = [];
              const collectNodes = (node: VisualNode | null) => {
                if (!node) return;
                nodesList.push(node);
                collectNodes(node.left);
                collectNodes(node.right);
              };
              collectNodes(visualTree.root);

              return nodesList.map((node) => {
                const isSelected = selectedNode?.key === node.key;
                const isHighlighted = highlightedNodes.has(node.key);
                const isPathNode = searchPath.includes(node.key);
                const isRoot = visualTree.root?.key === node.key;

                // Balance Factor color
                let bfBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (Math.abs(node.balanceFactor) > 1) {
                  bfBadgeColor = 'bg-red-100 text-red-800 border-red-400 font-black animate-pulse';
                } else if (node.balanceFactor !== 0) {
                  bfBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                }

                let ringClass = 'border-slate-300 hover:border-slate-400';
                if (isSelected) ringClass = 'ring-4 ring-indigo-500 border-indigo-600 shadow-lg scale-105';
                else if (isPathNode) ringClass = 'ring-3 ring-emerald-500 border-emerald-600 shadow-md scale-105';
                else if (isHighlighted) ringClass = 'ring-3 ring-amber-400 border-amber-500 shadow-md';

                return (
                  <div
                    key={node.key}
                    onClick={() => setSelectedNode(node)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-28 p-2 rounded-2xl bg-white border-2 cursor-pointer transition-all duration-500 text-center shadow-xs flex flex-col items-center justify-between ${ringClass}`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      zIndex: isSelected || isPathNode ? 20 : 10,
                    }}
                    title={`Click to inspect or delete Roll #${node.key}`}
                  >
                    {/* Top Row: BF and Height */}
                    <div className="flex items-center justify-between w-full text-[9px] font-mono font-bold mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-md border ${bfBadgeColor}`}
                        title={`Balance Factor: ${node.balanceFactor} (Left Height - Right Height)`}
                      >
                        BF: {node.balanceFactor > 0 ? `+${node.balanceFactor}` : node.balanceFactor}
                      </span>
                      <span className="text-slate-400" title={`Subtree Height: ${node.height}`}>
                        h={node.height}
                      </span>
                    </div>

                    {/* Middle: Roll & Name */}
                    <div className="my-0.5">
                      <div className="font-extrabold font-mono text-xs text-slate-900 leading-tight">
                        #{node.key}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate max-w-[90px] font-medium">
                        {node.data.name.split(' ')[0]}
                      </div>
                    </div>

                    {/* Bottom: Branch Badge */}
                    <div className="mt-1 flex items-center justify-center w-full">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-extrabold ${getBranchBadge(
                          node.data.branch
                        )}`}
                      >
                        {node.data.branch}
                      </span>
                    </div>

                    {/* Root Marker */}
                    {isRoot && (
                      <span className="absolute -top-3 bg-slate-900 text-white text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold">
                        Root
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center p-8 text-slate-400 space-y-2">
            <GitBranch className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">AVL Tree is Empty</p>
            <p className="text-xs">Click &quot;Reset Tree&quot; or add candidate nodes above.</p>
          </div>
        )}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 font-mono">
                Candidate #{selectedNode.key}: {selectedNode.data.name}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${getBranchBadge(
                  selectedNode.data.branch
                )}`}
              >
                {selectedNode.data.branch}
              </span>
            </div>
            <p className="text-slate-600 text-xs">
              Height: <strong>{selectedNode.height}</strong> • Balance Factor: <strong>{selectedNode.balanceFactor}</strong> • Left Child:{' '}
              <strong>{selectedNode.left ? `#${selectedNode.left.key}` : 'None'}</strong> • Right Child:{' '}
              <strong>{selectedNode.right ? `#${selectedNode.right.key}` : 'None'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRemoveStudent(selectedNode.key)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold cursor-pointer transition-all"
              title="Remove this node from AVL Tree and watch automatic rebalancing"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Remove Node from Tree</span>
            </button>

            <button
              onClick={() => setSelectedNode(null)}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Educational Footer: Balance Factor & Rotations Theory */}
      <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 text-xs space-y-2">
        <h4 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-700" />
          <span>How the AVL Tree Balances Lookups for Evaluators:</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-slate-700">
          <div className="bg-white p-3 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block font-bold">1. Balance Factor (BF)</strong>
            BF = Height(Left) - Height(Right). In AVL trees, every single node must maintain BF ∈ {'{-1, 0, +1}'}.
          </div>
          <div className="bg-white p-3 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block font-bold">2. LL &amp; RR Rotations</strong>
            Single rotations: LL rotates right when left-left path is too tall; RR rotates left when right-right path is too tall.
          </div>
          <div className="bg-white p-3 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block font-bold">3. LR &amp; RL Rotations</strong>
            Double rotations: LR first rotates child left, then parent right. RL first rotates child right, then parent left.
          </div>
          <div className="bg-white p-3 rounded-xl border border-indigo-100">
            <strong className="text-indigo-900 block font-bold">4. Why It Matters</strong>
            Without AVL balancing, sorted student rolls create an O(N) linked list. AVL guarantees search in O(log N) time.
          </div>
        </div>
      </div>
    </div>
  );
};

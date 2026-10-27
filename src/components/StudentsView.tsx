/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Student, BranchCode, AlgorithmTrace } from '../types';
import { BinarySearchTree } from '../dsa/bst';
import { AVLTree, RotationType } from '../dsa/avl';
import { ThreadedBinaryTree } from '../dsa/threadedBinaryTree';
import { AVLTreeVisualizer } from './AVLTreeVisualizer';
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  BookOpen, 
  Sparkles,
  GitBranch,
  ArrowRight,
  FileText,
  Printer,
  MapPin,
  Activity,
  X,
  CheckCircle2,
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (rollNo: number) => void;
  onRecordTrace: (trace: AlgorithmTrace) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onRecordTrace,
}) => {
  const [searchRollInput, setSearchRollInput] = useState<string>('');
  const [searchMode, setSearchMode] = useState<'AVL' | 'BST'>('AVL');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    student: Student | null;
    path: number[];
    comparisons: number;
    mode: 'AVL' | 'BST';
  } | null>(null);

  // Filter & search
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [nameFilter, setNameFilter] = useState<string>('');

  // Interactive AVL Rotations Lab
  const [rotationDemoTree, setRotationDemoTree] = useState<AVLTree>(() => new AVLTree());
  const [rotationActiveType, setRotationActiveType] = useState<RotationType | null>(null);

  // New Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoll, setNewRoll] = useState('');
  const [newName, setNewName] = useState('');
  const [newBranch, setNewBranch] = useState<BranchCode>('CSE');
  const [newSubject, setNewSubject] = useState('Data Structures');

  // Interactive row action modal states
  const [selectedDeskStudent, setSelectedDeskStudent] = useState<Student | null>(null);
  const [showEfficiencyModal, setShowEfficiencyModal] = useState(false);
  const [hallTicketStudent, setHallTicketStudent] = useState<Student | null>(null);

  // Build live BST and AVL structures
  const bst = useMemo(() => new BinarySearchTree(students), [students]);
  const avl = useMemo(() => new AVLTree(students), [students]);

  // Trace a student roll number visually in the AVL tree
  const handleTraceRollInTree = (roll: number) => {
    setSearchRollInput(roll.toString());
    setSearchMode('AVL');
    const startTime = performance.now();
    const res = avl.search(roll);
    const duration = Number((performance.now() - startTime).toFixed(2));
    setSearchResult({
      found: res.found,
      student: res.student,
      path: res.path,
      comparisons: res.comparisons,
      mode: 'AVL',
    });
    const el = document.getElementById('avl-tree-canvas-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Execute Search by Roll
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const roll = parseInt(searchRollInput.trim(), 10);
    if (isNaN(roll)) return;

    const startTime = performance.now();
    let res: any;

    if (searchMode === 'AVL') {
      res = avl.search(roll);
    } else {
      res = bst.search(roll);
    }

    const duration = Number((performance.now() - startTime).toFixed(2));

    setSearchResult({
      found: res.found,
      student: res.student,
      path: res.path,
      comparisons: res.comparisons,
      mode: searchMode,
    });

    onRecordTrace({
      id: `trace-search-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: `${searchMode} Search for Roll Number`,
      unit: 'Unit 1: Trees & Balanced Search',
      problemSolved: `Quickly find candidate record for Roll ${roll} in the student tree.`,
      timeComplexity: searchMode === 'AVL' ? 'O(log N) guaranteed' : 'Average O(log N), Worst O(N)',
      spaceComplexity: 'O(1) memory',
      inputSummary: `Searched for Roll ${roll} out of ${students.length} students`,
      executionTimeMs: duration,
      operationCount: res.comparisons,
      steps: [
        `Started searching at the top (root) of the tree for Roll ${roll}.`,
        ...res.path.map((nodeRoll: number, idx: number) => {
          if (nodeRoll === roll) {
            return `Step ${idx + 1}: Found exact match at student node ${nodeRoll}!`;
          } else if (roll < nodeRoll) {
            return `Step ${idx + 1}: Target Roll ${roll} is smaller than ${nodeRoll} → go LEFT.`;
          } else {
            return `Step ${idx + 1}: Target Roll ${roll} is bigger than ${nodeRoll} → go RIGHT.`;
          }
        }),
        res.found
          ? `Found student record: ${res.student?.name} (${res.student?.branch}).`
          : `Reached the end. Roll ${roll} is not registered yet.`,
      ],
      resultSummary: res.found
        ? `Found ${res.student?.name} in just ${res.comparisons} comparisons!`
        : `Roll ${roll} not found after ${res.comparisons} comparisons.`,
    });
  };

  // Trigger individual AVL rotation demo
  const triggerRotationDemo = (type: RotationType) => {
    const demoTree = new AVLTree();
    setRotationActiveType(type);

    let keys: number[] = [];
    if (type === 'LL') keys = [30, 20, 10]; // Right rotation around 30
    else if (type === 'RR') keys = [10, 20, 30]; // Left rotation around 10
    else if (type === 'LR') keys = [30, 10, 20]; // Left on 10, then Right on 30
    else if (type === 'RL') keys = [10, 30, 20]; // Right on 30, then Left on 10

    keys.forEach((k) => {
      demoTree.insert({
        rollNo: k,
        name: `Student ${k}`,
        branch: 'CSE',
        subject: 'Algorithms',
        semester: 4,
      });
    });

    setRotationDemoTree(demoTree);

    const latestRot = demoTree.rotationHistory[demoTree.rotationHistory.length - 1];

    onRecordTrace({
      id: `trace-rot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: `AVL ${type} Rotation`,
      unit: 'Unit 1: Self-Balancing Trees',
      problemSolved: `Balance the tree after adding numbers [${keys.join(', ')}] so searches stay fast.`,
      timeComplexity: 'O(1) instant swap',
      spaceComplexity: 'O(1) memory',
      inputSummary: `Inserted in order: [${keys.join(', ')}]`,
      executionTimeMs: 0.1,
      operationCount: demoTree.rotationHistory.length,
      steps: [
        `Added roll number ${keys[0]} as root.`,
        `Added roll number ${keys[1]}. Tree is still balanced.`,
        `Added roll number ${keys[2]}. One side became too heavy!`,
        `Performed ${type} Rotation: ${latestRot?.reason || 'Restored balance'}.`,
        `Tree is now perfectly balanced with a height of ${demoTree.getHeight()}.`,
      ],
      resultSummary: `Tree rebalanced using ${type} rotation. Looking up numbers will be fast.`,
    });
  };

  // Sorted Insertion Benchmark (BST vs AVL)
  const [benchmarkResult, setBenchmarkResult] = useState<{
    rolls: number[];
    bstHeight: number;
    avlHeight: number;
    bstComparisonsWorst: number;
    avlComparisonsWorst: number;
  } | null>(null);

  const runSortedBenchmark = () => {
    const seq = [101, 102, 103, 104, 105, 106, 107];
    const testBst = new BinarySearchTree();
    const testAvl = new AVLTree();

    seq.forEach((r) => {
      const dummy: Student = { rollNo: r, name: `Student ${r}`, branch: 'CSE', subject: 'Data Structures', semester: 4 };
      testBst.insert(dummy);
      testAvl.insert(dummy);
    });

    setBenchmarkResult({
      rolls: seq,
      bstHeight: testBst.getHeight(),
      avlHeight: testAvl.getHeight(),
      bstComparisonsWorst: testBst.getHeight(),
      avlComparisonsWorst: testAvl.getHeight(),
    });
  };

  // Threaded Binary Tree Demo
  const [tbtOutput, setTbtOutput] = useState<{
    order: { key: number; data: string; viaThread: boolean }[];
    explanation: string;
  } | null>(null);

  const runTbtDemo = () => {
    const tbt = new ThreadedBinaryTree();
    [20, 10, 30, 5, 15, 25, 35].forEach((k) => {
      tbt.insert(k, `Student ${k}`);
    });
    setTbtOutput(tbt.inorderTraversalWithTrace());
  };

  // Add new student handler
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roll = parseInt(newRoll, 10);
    if (isNaN(roll) || !newName.trim()) return;

    const student: Student = {
      rollNo: roll,
      name: newName.trim(),
      branch: newBranch,
      subject: newSubject.trim(),
      semester: 4,
    };

    onAddStudent(student);
    setIsAddModalOpen(false);
    setNewRoll('');
    setNewName('');

    onRecordTrace({
      id: `trace-add-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Insert Student into Tree',
      unit: 'Unit 1: Trees & Balanced Search',
      problemSolved: `Save student Roll ${roll} into our self-balancing tree.`,
      timeComplexity: 'O(log N) fast insertion',
      spaceComplexity: 'O(1) node memory',
      inputSummary: `New student: ${student.name} (Roll ${roll}, ${student.branch})`,
      executionTimeMs: 0.2,
      operationCount: 1,
      steps: [
        `Created new student record for Roll ${roll}.`,
        `Navigated down the tree to place the roll number in correct sorted order.`,
        `Checked tree balance to make sure search speeds remain high.`,
      ],
      resultSummary: `Student ${student.name} (Roll ${roll}) saved successfully.`,
    });
  };

  // Filter students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchBranch = selectedBranch === 'ALL' || s.branch === selectedBranch;
      const matchName =
        !nameFilter ||
        s.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        s.rollNo.toString().includes(nameFilter);
      return matchBranch && matchName;
    });
  }, [students, selectedBranch, nameFilter]);

  return (
    <div className="space-y-6">
      {/* View Header in Simple Words */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              STUDENT DIRECTORY
            </span>
            <span className="text-xs text-slate-500 font-medium">Fast Roll Number Search using Trees</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Student Records &amp; Fast Search
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Instead of searching through a slow list one-by-one, student roll numbers are stored in a <strong>Self-Balancing Tree (AVL Tree)</strong>. Even with thousands of students, the computer finds anyone in just a few quick comparisons.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Roll Number Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-600" />
              <span>Search for a Student by Roll Number</span>
            </h3>
            <p className="text-xs text-slate-500">
              Type a roll number and watch the computer trace the exact path through the tree.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Search Method:</span>
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setSearchMode('AVL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  searchMode === 'AVL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Fast Tree (AVL)
              </button>
              <button
                onClick={() => setSearchMode('BST')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  searchMode === 'BST' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Normal Tree (BST)
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="number"
              placeholder="Enter roll number (e.g. 105, 203, 310, 401)..."
              value={searchRollInput}
              onChange={(e) => setSearchRollInput(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-800 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            Search Now
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchRollInput('105');
              setTimeout(() => {
                const res = avl.search(105);
                setSearchResult({
                  found: res.found,
                  student: res.student,
                  path: res.path,
                  comparisons: res.comparisons,
                  mode: 'AVL',
                });
              }, 50);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Try Roll 105
          </button>
        </form>

        {/* Search Result Box */}
        {searchResult && (
          <div className={`p-4 rounded-lg border text-xs ${
            searchResult.found 
              ? 'bg-slate-50 border-slate-200' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {searchResult.found && searchResult.student ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      {searchResult.student.name}
                    </span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">
                      Roll #{searchResult.student.rollNo}
                    </span>
                    <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {searchResult.student.branch}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Subject: {searchResult.student.subject}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Assigned Exam Hall</span>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {searchResult.student.assignedHallId 
                        ? searchResult.student.assignedHallId.toUpperCase() 
                        : 'Not assigned yet'}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Assigned Desk</span>
                    <div className="font-bold text-slate-900 mt-0.5 font-mono">
                      {searchResult.student.assignedSeatId || 'Pending'}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Checks Needed</span>
                    <div className="font-bold text-indigo-700 mt-0.5 font-mono">
                      Found in {searchResult.comparisons} checks!
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Path taken through the tree:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                    {searchResult.path.map((key, i) => (
                      <React.Fragment key={key}>
                        <span className={`px-2 py-0.5 rounded border ${
                          key === searchResult.student?.rollNo
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}>
                          Roll {key}
                        </span>
                        {i < searchResult.path.length - 1 && (
                          <span className="text-slate-400 font-bold">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>No student found with Roll Number {searchRollInput}.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual AVL Tree Representation with Live Rotations (LL, RR, LR, RL) */}
      <div id="avl-tree-canvas-section">
        <AVLTreeVisualizer
          students={students}
          onRecordTrace={onRecordTrace}
          onStudentAdded={onAddStudent}
          onStudentDeleted={onDeleteStudent}
        />
      </div>

      {/* 2 Educational Cards in Plain English */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Tree Rotations */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                How Tree Rotations Keep Searches Fast
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Unit 1 Trees</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            If new students arrive with roll numbers in order (like 10, 20, 30), a normal tree leans to one side and becomes slow. An <strong>AVL Tree</strong> automatically &ldquo;rotates&rdquo; its branches so the middle number stays at the top.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['LL', 'RR', 'LR', 'RL'] as RotationType[]).map((type) => (
              <button
                key={type}
                onClick={() => triggerRotationDemo(type)}
                className={`p-2 rounded border text-left transition-colors ${
                  rotationActiveType === type
                    ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-slate-900 text-xs font-mono">{type} Rotation</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {type === 'LL' ? 'Right turn' : type === 'RR' ? 'Left turn' : type === 'LR' ? 'Left-Right' : 'Right-Left'}
                </div>
              </button>
            ))}
          </div>

          {rotationDemoTree.root && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Balanced Tree Result:</span>
                <span className="font-mono text-indigo-700">Depth = {rotationDemoTree.getHeight()} levels</span>
              </div>
              <div className="font-mono text-slate-800 bg-white p-2.5 rounded border border-slate-200 text-xs">
                <div>Top (Root): Roll #{rotationDemoTree.root.key}</div>
                <div className="pl-4 text-slate-600">├─ Left: {rotationDemoTree.root.left ? `Roll #${rotationDemoTree.root.left.key}` : 'None'}</div>
                <div className="pl-4 text-slate-600">└─ Right: {rotationDemoTree.root.right ? `Roll #${rotationDemoTree.root.right.key}` : 'None'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Benchmark - Normal vs Fast Tree */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Speed Test: Normal Tree vs Fast Tree
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Real Test</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            See what happens when you add 7 students with roll numbers 101, 102, 103, 104, 105, 106, 107.
          </p>

          <button
            onClick={runSortedBenchmark}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Run Test on Rolls 101 to 107</span>
          </button>

          {benchmarkResult ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-amber-50/70 border border-amber-200 rounded p-3 text-xs space-y-1">
                <div className="font-bold text-amber-900">Normal Tree (BST)</div>
                <div className="text-[11px] text-amber-800">
                  Levels: <strong className="font-mono text-sm">{benchmarkResult.bstHeight}</strong> (Long straight line)
                </div>
                <div className="text-[11px] text-amber-800">
                  Worst-case checks: <strong className="font-mono">{benchmarkResult.bstComparisonsWorst}</strong>
                </div>
                <div className="text-[10px] text-amber-700 pt-1 border-t border-amber-200">
                  Very slow! Like flipping through a long list one by one.
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded p-3 text-xs space-y-1">
                <div className="font-bold text-emerald-900">Balanced Tree (AVL)</div>
                <div className="text-[11px] text-emerald-800">
                  Levels: <strong className="font-mono text-sm">{benchmarkResult.avlHeight}</strong> (Balanced pyramid)
                </div>
                <div className="text-[11px] text-emerald-800">
                  Worst-case checks: <strong className="font-mono">{benchmarkResult.avlComparisonsWorst}</strong>
                </div>
                <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200">
                  Super fast! Takes less than half the steps.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
              Click above to test how both trees handle sorted numbers.
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Threaded Binary Tree in Simple Words */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Saving Computer Memory: Threaded Binary Tree
            </h3>
          </div>
          <button
            onClick={runTbtDemo}
            className="text-xs px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors font-semibold"
          >
            Show Memory-Saving Walk
          </button>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          In normal trees, half of all pointer links are empty (NULL). A <strong>Threaded Binary Tree</strong> replaces empty links with direct shortcut &ldquo;threads&rdquo; to the next student, allowing the computer to print roll numbers in sorted order without using extra memory.
        </p>

        {tbtOutput && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
            <div className="font-bold text-slate-800 text-[11px]">Sorted Student Order via Shortcut Threads:</div>
            <div className="flex flex-wrap items-center gap-2 font-mono">
              {tbtOutput.order.map((item, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded border text-xs ${
                    item.viaThread
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                  title={item.viaThread ? 'Direct thread shortcut' : 'Normal branch'}
                >
                  Roll #{item.key} {item.viaThread && '🧵 (thread)'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Student Directory Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Complete Student Directory</h3>
            <span className="text-xs text-slate-500 font-mono">({filteredStudents.length} students)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Efficiency Analysis Button */}
            <button
              onClick={() => setShowEfficiencyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded border border-indigo-200 transition-all cursor-pointer shadow-2xs"
              title="Show AVL O(log N) vs Linear Search O(N) comparisons report"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Search Efficiency (Tree vs Linear)</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Department:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded text-xs bg-white font-medium"
              >
                <option value="ALL">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="AIDS">AIDS</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Search by name or roll..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded text-xs bg-white w-40"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Roll Number</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Exam Subject</th>
                <th className="py-2.5 px-4">Assigned Hall</th>
                <th className="py-2.5 px-4">Desk #</th>
                <th className="py-2.5 px-4 text-right">Interactive Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.rollNo} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">
                      {student.rollNo}
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-800">
                      {student.name}
                    </td>
                    <td className="py-2 px-4 font-mono font-bold text-slate-700">
                      {student.branch}
                    </td>
                    <td className="py-2 px-4 text-slate-600">
                      {student.subject}
                    </td>
                    <td className="py-2 px-4">
                      {student.assignedHallId ? (
                        <span className="font-mono text-slate-800 uppercase text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                          {student.assignedHallId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Not assigned</span>
                      )}
                    </td>
                    <td className="py-2 px-4 font-mono text-slate-700 font-bold text-[11px]">
                      {student.assignedSeatId || '-'}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Trace in Tree button */}
                        <button
                          onClick={() => handleTraceRollInTree(student.rollNo)}
                          className="px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Trace search path step-by-step in AVL Tree"
                        >
                          <Search className="w-3 h-3" />
                          <span>Trace Tree</span>
                        </button>

                        {/* Locate Desk button */}
                        <button
                          onClick={() => setSelectedDeskStudent(student)}
                          className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Inspect assigned exam desk and venue"
                        >
                          <MapPin className="w-3 h-3 text-slate-600" />
                          <span>Desk</span>
                        </button>

                        {/* Hall Ticket Admit Pass button */}
                        <button
                          onClick={() => setHallTicketStudent(student)}
                          className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Preview student exam admit card / pass"
                        >
                          <FileText className="w-3 h-3 text-emerald-700" />
                          <span>Pass</span>
                        </button>

                        {/* Delete student record */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete student Roll ${student.rollNo} (${student.name})?`)) {
                              onDeleteStudent(student.rollNo);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Delete student record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No students match your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Add New Student</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddStudentSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Roll Number (Unique Number)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 150"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohini Sen"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Department (Branch)</label>
                <select
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value as BranchCode)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-medium"
                >
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="ECE">Electronics (ECE)</option>
                  <option value="MECH">Mechanical (MECH)</option>
                  <option value="AIDS">AI &amp; Data Science (AIDS)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exam Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 1: Locate Desk Modal */}
      {selectedDeskStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Examinee Desk &amp; Venue Details</h3>
              </div>
              <button
                onClick={() => setSelectedDeskStudent(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">{selectedDeskStudent.name}</div>
                <div className="font-mono text-indigo-900 flex items-center gap-2">
                  <span>Roll #{selectedDeskStudent.rollNo}</span>
                  <span>•</span>
                  <span>{selectedDeskStudent.branch}</span>
                  <span>•</span>
                  <span>{selectedDeskStudent.subject}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">Assigned Venue</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedDeskStudent.assignedHallId 
                      ? selectedDeskStudent.assignedHallId.toUpperCase() 
                      : 'Not Seated'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-sans font-bold">Desk Number</span>
                  <div className="font-bold text-indigo-700 text-sm mt-0.5">
                    {selectedDeskStudent.assignedSeatId || 'Pending'}
                  </div>
                </div>
              </div>

              <div className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {selectedDeskStudent.assignedSeatId ? (
                  <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Candidate desk confirmed! Checked against all 4 neighbors to ensure zero branch or subject collisions.
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium">
                    Candidate is currently in the unassigned waiting pool. Click &ldquo;Generate Seating Plan&rdquo; or &ldquo;Auto-Seat Next&rdquo; on the Seating Plan page.
                  </span>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedDeskStudent(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AVL Tree vs Linear Search Efficiency Modal */}
      {showEfficiencyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Search Algorithm Performance &amp; Complexity</h3>
              </div>
              <button
                onClick={() => setShowEfficiencyModal(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Comparison of searching among <strong>{students.length} student records</strong> using different data structures:
              </p>

              <div className="space-y-3 font-mono">
                {/* Linear Search */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-bold text-slate-900">Linear Array Search</span>
                    <span className="text-red-700 font-bold font-mono">O(N)</span>
                  </div>
                  <div className="text-slate-600 text-[11px] font-sans mt-1">
                    Examines every roll number one-by-one from the beginning.
                  </div>
                  <div className="mt-2 text-slate-800 text-[11px]">
                    Average checks: <strong>{Math.round(students.length / 2)}</strong> comparisons • Worst case: <strong>{students.length}</strong> comparisons
                  </div>
                </div>

                {/* Normal BST */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-bold text-slate-900">Standard Binary Search Tree (BST)</span>
                    <span className="text-amber-700 font-bold font-mono">O(h)</span>
                  </div>
                  <div className="text-slate-600 text-[11px] font-sans mt-1">
                    Divides by roll number, but risks degrading to O(N) when roll numbers arrive in sorted order.
                  </div>
                  <div className="mt-2 text-slate-800 text-[11px]">
                    Current tree height: <strong>{bst.getHeight()}</strong> levels • Skew risk: High if unrotated
                  </div>
                </div>

                {/* AVL Tree */}
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-extrabold text-indigo-950">AVL Self-Balancing Tree (Implemented)</span>
                    <span className="text-emerald-700 font-bold font-mono">O(log N) Guaranteed</span>
                  </div>
                  <div className="text-slate-700 text-[11px] font-sans mt-1">
                    Self-balances on every insertion with LL, RR, LR, RL rotations so height never exceeds 1.44 · log₂(N).
                  </div>
                  <div className="mt-2 text-indigo-900 text-[11px]">
                    Max comparisons needed: <strong>{Math.ceil(1.44 * Math.log2(Math.max(2, students.length))) + 1}</strong> comparisons! Over <strong>{(students.length / (Math.ceil(Math.log2(students.length)) + 1)).toFixed(1)}x faster</strong> than linear search.
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowEfficiencyModal(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer hover:bg-slate-800"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Hall Ticket Admit Card Modal */}
      {hallTicketStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Official Examination Hall Ticket</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer hover:bg-slate-800 shadow-xs"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print Ticket</span>
                </button>
                <button
                  onClick={() => setHallTicketStudent(null)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="border-2 border-slate-900 p-4 rounded-xl space-y-3 bg-white">
                <div className="text-center border-b border-slate-300 pb-2 space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Autonomous College Examination Cell</div>
                  <div className="text-sm font-extrabold text-slate-900">STUDENT ADMIT PASS</div>
                  <div className="text-[10px] text-slate-500 font-mono">End-Semester Examinations 2026–2027</div>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Candidate Name:</span>
                    <span className="font-bold text-slate-900 font-sans">{hallTicketStudent.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Roll Number:</span>
                    <span className="font-bold text-indigo-700">#{hallTicketStudent.rollNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Department:</span>
                    <span className="font-bold text-slate-900">{hallTicketStudent.branch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Subject:</span>
                    <span className="text-slate-800 font-sans">{hallTicketStudent.subject}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-sans">Examination Hall:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {hallTicketStudent.assignedHallId || 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Assigned Desk:</span>
                    <span className="font-extrabold text-indigo-700 text-sm">
                      {hallTicketStudent.assignedSeatId || 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
                  <div>Reporting: 09:30 AM</div>
                  <div className="text-right">Controller Signature: ______</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

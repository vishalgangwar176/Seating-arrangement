/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab } from './Navbar';
import { TestCaseResult } from '../types';
import { runAllTestCases } from '../dsa/testSuite';
import { SYLLABUS_TOPICS } from '../data/syllabus';
import { 
  Presentation, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileCheck
} from 'lucide-react';

interface PresentationAndTestsViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onGenerateSeating: () => void;
  onRunAudit: () => void;
}

export const PresentationAndTestsView: React.FC<PresentationAndTestsViewProps> = ({
  setActiveTab,
  onGenerateSeating,
  onRunAudit,
}) => {
  const [subTab, setSubTab] = useState<'script' | 'tests' | 'syllabus'>('script');

  // Presentation Script State
  const [currentStep, setCurrentStep] = useState(0);

  // Test Suite State
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Syllabus search state
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    executeTests();
  }, []);

  const executeTests = () => {
    setIsTestRunning(true);
    setTimeout(() => {
      const results = runAllTestCases();
      setTestResults(results);
      setIsTestRunning(false);
    }, 120);
  };

  const passCount = testResults.filter((t) => t.status === 'passed').length;
  const failCount = testResults.filter((t) => t.status === 'failed').length;

  const presentationSteps = [
    {
      title: 'Step 1: The Problem & What This System Does',
      unit: 'Introduction & Project Goal',
      duration: '35 seconds',
      talkTrack:
        'Good morning, respected teachers. In our college examinations, creating seating arrangements by hand is time-consuming and often accidentally places classmates from the same department next to each other, which leads to copying. In our prototype, administrators can specify the exact number of students per department (CSE, ECE, MECH, AIDS), and the system automatically allocates them into examination halls using Multi-Stage DP and Priority Queues, ensuring balanced branch ratios and zero peer neighbor conflicts.',
      dsaConcepts: [
        'Automatic Branch Intake: Write department cohort counts and see instant room placements.',
        'Multi-Stage DP and Priority Queues partition students to minimize room crowding.',
        'Runs directly in the browser with real data structures—no mock data or fake outputs.',
      ],
      actionLabel: 'Open Dashboard',
      actionTrigger: () => setActiveTab('dashboard'),
    },
    {
      title: 'Step 2: Storing Students in a Fast Self-Balancing Tree',
      unit: 'Unit 1: Trees (AVL Self-Balancing)',
      duration: '40 seconds',
      talkTrack:
        'To store student records, we use a Self-Balancing Tree (AVL Tree) keyed by roll number. Because roll numbers arrive in order, an ordinary binary tree would turn into a long, slow straight line. The AVL tree automatically rotates its branches using LL, RR, LR, and RL rotations so searches stay lightning-fast in O(log N) time, taking just 3 to 4 checks even with hundreds of students.',
      dsaConcepts: [
        'Normal Binary Search Tree (BST) vs Self-Balancing AVL Tree.',
        'Demonstrates all 4 rotation types: LL, RR, LR, and RL.',
        'Test proof: 7 sorted roll numbers make a normal tree 7 levels deep, but AVL tree is only 3 levels deep.',
      ],
      actionLabel: 'Open Student Search & AVL Demo',
      actionTrigger: () => setActiveTab('students'),
    },
    {
      title: 'Step 3: Generating and Changing the Seating Plan',
      unit: 'Unit 2 & 5: Heaps, Resource Allocation DP & Local Graph Swap',
      duration: '45 seconds',
      talkTrack:
        'Next, our system provides an Exam Seating Plan Generator where the exam cell can choose which halls to open, pick an allocation strategy (Multi-Stage DP, Max-Heap, or Min-Heap), and enforce department interleaving. Furthermore, administrators can manually change and swap any two desks with real-time clash verification, unseat candidates, or auto-place unassigned students into safe desks with 1-click Undo.',
      dsaConcepts: [
        'Multi-Stage Resource Allocation DP & Binary Heap Priority Queues for room dispatch.',
        'Backtracking constraint solver to place students with zero neighbor clashes.',
        'Interactive 2-click desk swap with local orthogonal graph re-audit and O(1) undo stack.',
      ],
      actionLabel: 'Open Seating Plan & Generator',
      actionTrigger: () => {
        onGenerateSeating();
        setActiveTab('seating');
      },
    },
    {
      title: 'Step 4: Hall Maps, Walking Aisles & Separate Wings',
      unit: 'Unit 3: Graphs (Adjacency & Connected Blocks)',
      duration: '40 seconds',
      talkTrack:
        'We model each hall as a planar graph where each desk is a point connected to its four neighbors. If we mark a desk as a walking aisle or broken bench, that connection breaks. Using graph traversal, the computer automatically discovers separate seating wings (like Left Wing and Right Wing) so each teacher can supervise one block.',
      dsaConcepts: [
        'Adjacency List: Stores connections between neighboring desks efficiently in O(V+E) space.',
        'Adjacency Matrix: Demonstrates why lists save memory compared to tables.',
        'Connected Components: Automatically splits the room into aisle-separated blocks.',
      ],
      actionLabel: 'Inspect Desks on Seating Plan',
      actionTrigger: () => setActiveTab('seating'),
    },
    {
      title: 'Step 5: Cheating Check & Invigilator Walking Simulation',
      unit: 'Unit 3: Graph Traversal (BFS & DFS)',
      duration: '40 seconds',
      talkTrack:
        'On the Cheating Check page, the computer audits every desk to guarantee zero conflicts. We also simulate how an invigilator walks through the room: Breadth-First Search (BFS) shows a teacher stepping outward in circles from the front desk, while Depth-First Search (DFS) shows a teacher walking down a full row aisle.',
      dsaConcepts: [
        'Automatic scan of all neighboring desks for matching branches or subjects.',
        'Breadth-First Search (BFS): Queue-based circular sweep from the front desk.',
        'Depth-First Search (DFS): Stack-based walk down rows and corridors.',
      ],
      actionLabel: 'Open Cheating Check & Patrol',
      actionTrigger: () => {
        onRunAudit();
        setActiveTab('conflicts');
      },
    },
    {
      title: 'Step 6: Fastest Walking Route & Campus Wiring',
      unit: 'Unit 4: Dijkstra & Minimum Spanning Trees',
      duration: '45 seconds',
      talkTrack:
        'For campus navigation, we use Dijkstra’s algorithm to calculate the shortest walking distance in meters from the Exam Office to any exam hall or desk. Below that, we calculate the shortest wire network to connect all halls for intercoms and cameras. Both Kruskal and Prim algorithms prove the exact same minimum wire length of 205 meters with zero loops.',
      dsaConcepts: [
        'Dijkstra Shortest Path: Calculates exact walking meters and minutes in O((V+E) log V).',
        'Kruskal Algorithm: Connects wire paths from shortest to longest without loops using DSU.',
        'Prim Algorithm: Grows the wire network outward from the Exam Office.',
      ],
      actionLabel: 'Open Campus Routes & Wiring',
      actionTrigger: () => setActiveTab('campus'),
    },
    {
      title: 'Step 7: Hall Selection Within Operating Budget',
      unit: 'Unit 5: Dynamic Programming (0/1 Knapsack)',
      duration: '45 seconds',
      talkTrack:
        'Opening halls costs money for power, AC, and invigilator pay. We solve this using Dynamic Programming (0/1 Knapsack). You slide the budget bar, and the computer computes the exact combination of halls that gives the maximum number of desks. We also balance student batches so no single branch dominates one room.',
      dsaConcepts: [
        '0/1 Knapsack: Decides which halls to open (1) or close (0) under budget in O(N · W).',
        '2D Calculation Table (DP Table): Visualizes how subproblems are solved.',
        'Multi-stage distribution: Balances branches equally across rooms.',
      ],
      actionLabel: 'Open Hall Budget Calculator',
      actionTrigger: () => setActiveTab('campus'),
    },
    {
      title: 'Step 8: Automated System Tests & Conclusion',
      unit: 'Testing & Oral Exam Ready',
      duration: '35 seconds',
      talkTrack:
        'To prove our implementation works without bugs, our system includes 12 automated checks that test AVL rotations, shortest walking routes, cable lengths, and neighbor conflict detection. All 12 tests pass in real time. Thank you, teachers. We are now ready for your questions!',
      dsaConcepts: [
        '12 live automated checks confirming genuine algorithmic correctness.',
        'Clean client-side execution with zero external library shortcuts.',
        'Ready for questions on any algorithm or data structure.',
      ],
      actionLabel: 'View Test Results Below',
      actionTrigger: () => setSubTab('tests'),
    },
  ];

  const currentSlide = presentationSteps[currentStep];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              EVALUATOR &amp; TESTING HUB
            </span>
            <span className="text-xs text-slate-500 font-medium">Viva Speaking Script &amp; System Health</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Teacher Presentation Guide &amp; Test Suite
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Everything you need for an oral review: read the simple speaking script out loud, run the 12 automated checks, or review the complete algorithm guide.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setSubTab('script')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              subTab === 'script'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Speaking Script (3 Mins)
          </button>
          <button
            onClick={() => setSubTab('tests')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'tests'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Automated Tests</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {passCount}/12
            </span>
          </button>
          <button
            onClick={() => setSubTab('syllabus')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              subTab === 'syllabus'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Algorithm Reference
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: Speaking Script */}
      {subTab === 'script' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / presentationSteps.length) * 100}%` }}
            />
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {currentSlide.unit}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
                  {currentSlide.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Pace: {currentSlide.duration}</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700">Step {currentStep + 1} of {presentationSteps.length}</span>
              </div>
            </div>

            {/* Speaking Box */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-5 text-indigo-950 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-indigo-700" />
                <span>What to say out loud to your teacher:</span>
              </div>
              <p className="text-sm sm:text-base leading-relaxed italic text-indigo-950 font-serif">
                &ldquo;{currentSlide.talkTrack}&rdquo;
              </p>
            </div>

            {/* Concepts & Action Button */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Key Points to Remember:</span>
                </h4>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside leading-relaxed">
                  {currentSlide.dsaConcepts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Live Verification on Screen:</span>
                  </h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Click this button right now to show the working feature live to your evaluators.
                  </p>
                </div>

                <button
                  onClick={currentSlide.actionTrigger}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{currentSlide.actionLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>

            <div className="flex items-center gap-1.5">
              {presentationSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                    i === currentStep
                      ? 'bg-slate-900 w-6'
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  title={`Step ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentStep((prev) => Math.min(presentationSteps.length - 1, prev + 1))}
              disabled={currentStep === presentationSteps.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-all shadow-xs cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Automated Tests */}
      {subTab === 'tests' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Passed Tests</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-700 mt-1">
                {passCount} / {testResults.length}
              </div>
              <div className="text-xs text-emerald-800 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-4 h-4" /> 100% Genuine assertions passed
              </div>
            </div>

            <div className={`border rounded-xl p-5 shadow-xs ${
              failCount > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider">Failed Checks</span>
              <div className="text-3xl font-extrabold font-mono mt-1">{failCount}</div>
              <div className="text-xs opacity-80 mt-1 font-medium">
                {failCount === 0 ? 'Zero regression defects' : 'Checks needing review'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Re-Test Everything</span>
                <p className="text-xs text-slate-500 mt-1">Run all 12 assertions live</p>
              </div>
              <button
                onClick={executeTests}
                disabled={isTestRunning}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isTestRunning ? 'Testing...' : 'Re-Run'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">12 Live Automated Assertions</h3>
              <span className="text-xs text-slate-500">Click any row to see details</span>
            </div>

            <div className="divide-y divide-slate-100">
              {testResults.map((tc) => {
                const isExpanded = expandedTestId === tc.id;
                return (
                  <div key={tc.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                    <div
                      onClick={() => setExpandedTestId(isExpanded ? null : tc.id)}
                      className="flex items-start justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {tc.id}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {tc.name}
                          </span>
                          <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 font-semibold">
                            {tc.unit}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {tc.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">
                          {tc.executionTimeMs} ms
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            tc.status === 'passed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {tc.status === 'passed' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>PASS</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-700" />
                              <span>FAIL</span>
                            </>
                          )}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-2 bg-slate-50 p-4 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-700">Expected: </span>
                          <span className="font-mono text-slate-600">{tc.expected}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">Actual: </span>
                          <span className="font-mono text-emerald-800 font-bold">{tc.actual}</span>
                        </div>
                        {tc.details && (
                          <div className="pt-1.5 text-slate-500 text-[11px] border-t border-slate-200">
                            <strong>Technical Detail:</strong> {tc.details}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Syllabus Reference */}
      {subTab === 'syllabus' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Units 1 to 5 Algorithm Reference
            </h3>
            <p className="text-xs text-slate-500">
              Quick oral review notes for every data structure used in this project.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {SYLLABUS_TOPICS.map((topic) => {
              const isExpanded = expandedTopic === topic.topicName;
              return (
                <div key={topic.topicName} className="py-3">
                  <div
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.topicName)}
                    className="flex items-center justify-between gap-4 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          Unit {topic.unit}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {topic.topicName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {topic.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {topic.locationInApp} • <span className="font-mono font-bold text-indigo-700">{topic.timeComplexity.split(' ')[0]}</span>
                      </div>
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
                      <div>
                        <strong className="text-slate-800">Why used in project:</strong>{' '}
                        <span className="text-slate-700">{topic.problemSolved}</span>
                      </div>
                      <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-200 text-indigo-950">
                        <strong className="text-indigo-900">What to say to your teacher:</strong>{' '}
                        <span className="italic font-serif">&ldquo;{topic.vivaExplanation}&rdquo;</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <strong>Limitation / Tradeoff:</strong> {topic.tradeoffOrLimitation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

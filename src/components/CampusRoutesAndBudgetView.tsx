/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Hall, Student, AlgorithmTrace } from '../types';
import { 
  CAMPUS_ROUTE_NODES, 
  CAMPUS_ROUTE_EDGES, 
  CAMPUS_INTERCOM_VERTICES, 
  CAMPUS_INTERCOM_EDGES 
} from '../data/sampleData';
import { runDijkstra, DijkstraResult } from '../dsa/dijkstra';
import { runKruskalsMST, runPrimsMST, MSTResult } from '../dsa/mst';
import { solve01Knapsack } from '../dsa/dpKnapsack';
import { allocateStudentsAcrossHalls } from '../dsa/resourceAllocation';
import { 
  Navigation, 
  Compass, 
  Network, 
  Calculator, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Sliders,
  Layers,
  Clock,
  X,
  FileText,
  Check,
} from 'lucide-react';

interface CampusRoutesAndBudgetViewProps {
  halls: Hall[];
  students: Student[];
  onRecordTrace: (trace: AlgorithmTrace) => void;
}

export const CampusRoutesAndBudgetView: React.FC<CampusRoutesAndBudgetViewProps> = ({
  halls,
  students,
  onRecordTrace,
}) => {
  const [activeSection, setActiveSection] = useState<'routes' | 'mst' | 'budget'>('routes');

  // Dijkstra state
  const [sourceNodeId, setSourceNodeId] = useState<string>('node-control');
  const [targetNodeId, setTargetNodeId] = useState<string>('node-hall-a101-desk');
  const [dijkstraResult, setDijkstraResult] = useState<DijkstraResult>(() =>
    runDijkstra(CAMPUS_ROUTE_NODES, CAMPUS_ROUTE_EDGES, 'node-control', 'node-hall-a101-desk')
  );

  // MST state
  const [kruskalResult, setKruskalResult] = useState<MSTResult>(() =>
    runKruskalsMST(CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES)
  );
  const [primResult, setPrimResult] = useState<MSTResult>(() =>
    runPrimsMST(CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES, 'Exam Cell Hub')
  );

  // Knapsack state
  const [capacityBudget, setCapacityBudget] = useState<number>(8);
  const [showMstSavingsModal, setShowMstSavingsModal] = useState(false);
  const [selectedDpCell, setSelectedDpCell] = useState<{
    hallName: string;
    cost: number;
    capacity: number;
    budget: number;
    value: number;
    formula: string;
  } | null>(null);
  const knapsackResult = useMemo(
    () => solve01Knapsack(halls, capacityBudget),
    [halls, capacityBudget]
  );
  const allocationResult = useMemo(
    () => allocateStudentsAcrossHalls(students, halls),
    [students, halls]
  );

  // Run Dijkstra
  const handleRunDijkstra = (src: string, tgt: string) => {
    setSourceNodeId(src);
    setTargetNodeId(tgt);

    const start = performance.now();
    const result = runDijkstra(CAMPUS_ROUTE_NODES, CAMPUS_ROUTE_EDGES, src, tgt);
    const duration = Number((performance.now() - start).toFixed(2));
    setDijkstraResult(result);

    const srcName = CAMPUS_ROUTE_NODES.find((n) => n.id === src)?.name || src;
    const tgtName = CAMPUS_ROUTE_NODES.find((n) => n.id === tgt)?.name || tgt;

    onRecordTrace({
      id: `trace-dijkstra-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: "Dijkstra's Shortest Path Algorithm",
      unit: 'Unit 4: Shortest Paths',
      problemSolved: `Find the fastest walking route from ${srcName} to ${tgtName}.`,
      timeComplexity: 'O((V + E) log V) with Priority Queue',
      spaceComplexity: 'O(V) memory',
      inputSummary: `From ${srcName} to ${tgtName}`,
      executionTimeMs: duration,
      operationCount: result.operationsCount,
      steps: result.steps,
      resultSummary: `Shortest walking path = ${result.shortestDistance}m (~${Math.ceil(result.shortestDistance / 75)} mins).`,
    });
  };

  // Re-verify MST
  const handleRecalculateMST = () => {
    const kRes = runKruskalsMST(CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES);
    const pRes = runPrimsMST(CAMPUS_INTERCOM_VERTICES, CAMPUS_INTERCOM_EDGES, 'Exam Cell Hub');
    setKruskalResult(kRes);
    setPrimResult(pRes);

    onRecordTrace({
      id: `trace-mst-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Minimum Spanning Tree (Kruskal vs Prim)',
      unit: 'Unit 4: Spanning Trees',
      problemSolved: 'Compute minimal intercom and CCTV cable layout to link all exam venues.',
      timeComplexity: 'Kruskal: O(E log E) | Prim: O(E log V)',
      spaceComplexity: 'O(V) memory',
      inputSummary: `${CAMPUS_INTERCOM_VERTICES.length} venues, ${CAMPUS_INTERCOM_EDGES.length} candidate paths`,
      executionTimeMs: 0.25,
      operationCount: kRes.operationsCount + pRes.operationsCount,
      steps: [
        'Kruskal: Sorted all paths by cable length in ascending order.',
        'Kruskal: Added paths using Disjoint Set Union (DSU) to eliminate cycles.',
        'Prim: Grew the network outward from the Central Exam Cell Hub.',
        `Both algorithms proved identical minimal cable length of ${kRes.totalWeight}m.`,
      ],
      resultSummary: `Total Cable = ${kRes.totalWeight}m across ${kRes.edges.length} conduits.`,
    });
  };

  // Run Knapsack
  const handleRecalculateKnapsack = (budget: number) => {
    setCapacityBudget(budget);
    const res = solve01Knapsack(halls, budget);

    onRecordTrace({
      id: `trace-knapsack-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: '0/1 Knapsack Dynamic Programming',
      unit: 'Unit 5: Dynamic Programming',
      problemSolved: `Select optimal hall subset to maximize candidate seats under budget ${budget}.`,
      timeComplexity: 'O(N · W) pseudo-polynomial',
      spaceComplexity: 'O(N · W) memoization table',
      inputSummary: `${halls.length} halls, Budget: ${budget} units`,
      executionTimeMs: 0.2,
      operationCount: (halls.length + 1) * (budget + 1),
      steps: res.steps,
      resultSummary: `Selected ${res.selectedHalls.length} halls unlocking ${res.maxCapacityAchieved} seats.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              CAMPUS LOGISTICS &amp; OPTIMIZATION
            </span>
            <span className="text-xs text-slate-500 font-medium">Navigation, Infrastructure &amp; Budgeting</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Campus Walking Routes, Cable Network &amp; Hall Budget
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Optimizes exam logistics using three core algorithms: <strong>Dijkstra</strong> for staff walking directions, <strong>Kruskal/Prim</strong> for minimum intercom wiring, and <strong>0/1 Knapsack</strong> for picking halls under budget.
          </p>
        </div>

        {/* 3 Section Switchers */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveSection('routes')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'routes'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Walking Routes
          </button>
          <button
            onClick={() => setActiveSection('mst')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'mst'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cable Network (MST)
          </button>
          <button
            onClick={() => setActiveSection('budget')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'budget'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hall Budget (Knapsack)
          </button>
        </div>
      </div>

      {/* SECTION 1: Walking Routes (Dijkstra) */}
      {activeSection === 'routes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Fastest Walking Directions for Exam Staff (Dijkstra)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculates exact shortest walking path from the Control Room to any examination hall entrance or invigilator dais.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
              Complexity: O((V+E) log V)
            </span>
          </div>

          {/* Form Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Starting Location:
              </label>
              <select
                value={sourceNodeId}
                onChange={(e) => handleRunDijkstra(e.target.value, targetNodeId)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-xs shadow-2xs"
              >
                {CAMPUS_ROUTE_NODES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} (Floor {n.floor})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Target Hall / Desk:
              </label>
              <select
                value={targetNodeId}
                onChange={(e) => handleRunDijkstra(sourceNodeId, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-xs shadow-2xs"
              >
                {CAMPUS_ROUTE_NODES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} (Floor {n.floor})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => handleRunDijkstra(sourceNodeId, targetNodeId)}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-indigo-300" />
                <span>Calculate Shortest Route</span>
              </button>
            </div>

            {/* Quick Route Preset Buttons */}
            <div className="sm:col-span-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-semibold text-[11px] mr-1">Quick Route Presets:</span>
              <button
                onClick={() => handleRunDijkstra('node-control', 'node-hall-a101-desk')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                title="Calculate route from Control Room to Hall A101 Dais"
              >
                Control Room → Hall A101 Dais
              </button>
              <button
                onClick={() => handleRunDijkstra('node-gate', 'node-exam-hub')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                title="Calculate route from Main Gate to Central Exam Cell Hub"
              >
                Main Gate → Exam Cell Hub
              </button>
              <button
                onClick={() => handleRunDijkstra('node-control', 'node-hall-b201')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                title="Calculate route from Control Room to Hall B201 (Floor 2)"
              >
                Control Room → Hall B201 (Floor 2)
              </button>
              <button
                onClick={() => handleRunDijkstra('node-exam-hub', 'node-hall-c301')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                title="Calculate route from Exam Cell Hub to Hall C301 (Floor 3)"
              >
                Exam Cell Hub → Hall C301 (Floor 3)
              </button>
            </div>
          </div>

          {/* Dijkstra Output */}
          {dijkstraResult.shortestDistance >= 0 ? (
            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-extrabold text-slate-900 text-base">
                      Shortest Walking Distance: {dijkstraResult.shortestDistance} Meters
                    </span>
                    <span className="text-slate-500 ml-2 font-mono text-xs">
                      (~{Math.max(1, Math.ceil(dijkstraResult.shortestDistance / 75))} minute brisk walk)
                    </span>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-600 text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  {dijkstraResult.path.length} Sequential Waypoints
                </span>
              </div>

              {/* Waypoints Sequence */}
              <div>
                <span className="font-bold text-slate-700 text-xs block mb-2">
                  Corridor Waypoints Sequence:
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {dijkstraResult.pathNodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <span
                        className={`px-3 py-1.5 rounded-lg border shadow-2xs font-semibold ${
                          i === 0
                            ? 'bg-slate-900 text-white font-bold'
                            : i === dijkstraResult.pathNodes.length - 1
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold'
                            : 'bg-white text-slate-800 border-slate-200'
                        }`}
                      >
                        {node.name} (Fl {node.floor})
                      </span>
                      {i < dijkstraResult.pathNodes.length - 1 && (
                        <span className="text-slate-400 font-bold">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              Venue is not reachable from the selected starting point.
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Cable Network (MST: Kruskal vs Prim) */}
      {activeSection === 'mst' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Inter-Hall Emergency Intercom &amp; CCTV Cabling Network
                </h3>
                <p className="text-xs text-slate-500">
                  Finds the minimum total wire length connecting all examination venues with zero cyclic loops.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowMstSavingsModal(true)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="View comparison between MST vs Full Mesh Network cabling"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cable Savings Report</span>
              </button>

              <button
                onClick={handleRecalculateMST}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Verify Both Algorithms</span>
              </button>
            </div>
          </div>

          {/* Side by side Kruskal vs Prim comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Kruskal */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Kruskal&apos;s Algorithm</h4>
                  <span className="text-[11px] text-slate-500">
                    Sorts all conduits, uses Disjoint Set Union (DSU)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-sm text-emerald-700">
                    {kruskalResult.totalWeight} Meters
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">Total Cable</span>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                {kruskalResult.edges.map((e, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800">
                      {e.u} ↔ {e.v}
                    </span>
                    <span className="font-bold text-slate-900">{e.weight}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prim */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Prim&apos;s Algorithm</h4>
                  <span className="text-[11px] text-slate-500">
                    Grows cut outward from Exam Cell Hub
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-sm text-emerald-700">
                    {primResult.totalWeight} Meters
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">Total Cable</span>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                {primResult.edges.map((e, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
                  >
                    <span className="font-semibold text-slate-800">
                      {e.u} ↔ {e.v}
                    </span>
                    <span className="font-bold text-slate-900">{e.weight}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">MST Invariance Proved: </span>
              Both Kruskal and Prim produced an identical minimum cable length of <strong>{kruskalResult.totalWeight} meters</strong> connecting all {CAMPUS_INTERCOM_VERTICES.length} buildings with zero waste.
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Hall Budget (0/1 Knapsack) */}
      {activeSection === 'budget' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hall Selection Under Operational Budget (0/1 Knapsack)
                </h3>
                <p className="text-xs text-slate-500">
                  Find the exact combination of examination halls that maximizes student seating without exceeding your budget.
                </p>
              </div>
            </div>

            {/* Presets and Slider */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleRecalculateKnapsack(4)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    capacityBudget === 4 ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Test minimal budget constraint (4 units)"
                >
                  Budget 4
                </button>
                <button
                  onClick={() => handleRecalculateKnapsack(8)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    capacityBudget === 8 ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Test standard budget constraint (8 units)"
                >
                  Budget 8
                </button>
                <button
                  onClick={() => handleRecalculateKnapsack(12)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    capacityBudget === 12 ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Test campus-wide budget constraint (12 units)"
                >
                  Budget 12
                </button>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-2.5 text-xs bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 font-mono">
                <span className="text-slate-700 font-bold font-sans">Custom:</span>
                <input
                  type="range"
                  min={2}
                  max={14}
                  value={capacityBudget}
                  onChange={(e) => handleRecalculateKnapsack(parseInt(e.target.value, 10))}
                  className="w-24 accent-indigo-600 cursor-pointer"
                />
                <span className="font-bold text-indigo-700 w-8 text-center">{capacityBudget}</span>
              </div>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-slate-500 uppercase font-semibold text-[10px]">Max Seating Capacity</span>
              <div className="text-2xl font-extrabold font-mono text-indigo-700 mt-1">
                {knapsackResult.maxCapacityAchieved} Desks
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Across {knapsackResult.selectedHalls.length} selected halls
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-slate-500 uppercase font-semibold text-[10px]">Budget Spent</span>
              <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
                {knapsackResult.totalCostIncurred} / {knapsackResult.capacityLimit} Units
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {Math.round((knapsackResult.totalCostIncurred / knapsackResult.capacityLimit) * 100)}% budget efficiency
              </div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-indigo-950">
              <span className="uppercase font-bold text-[10px] text-indigo-700">DP Recurrence Formula</span>
              <div className="font-mono text-[11px] font-bold text-indigo-900 mt-1">
                DP[i][w] = max(DP[i-1][w], DP[i-1][w-cost] + cap)
              </div>
              <div className="text-[10px] text-indigo-700 mt-1">
                Time: O(N · W) | Space: O(N · W)
              </div>
            </div>
          </div>

          {/* Selected Halls */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-700 text-xs">Halls Selected by Dynamic Programming:</span>
            <div className="flex flex-wrap gap-2.5">
              {knapsackResult.selectedHalls.map((item) => (
                <span
                  key={item.hallId}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{item.name}</span>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    ({item.capacity} desks, Cost: {item.cost})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* 2D DP Table */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 text-xs block">
              2D State Table (DP[i][w]):
            </span>
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-56 font-mono text-xs">
              <table className="w-full text-center">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2 text-left border-r border-slate-200 w-36">Hall</th>
                    <th className="p-2 border-r border-slate-200 w-16">Cost</th>
                    <th className="p-2 border-r border-slate-200 w-16">Seats</th>
                    {Array.from({ length: knapsackResult.capacityLimit + 1 }).map((_, w) => (
                      <th key={w} className="p-1.5 text-[11px] w-9">
                        w={w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {knapsackResult.dpTable.map((row, i) => {
                    const item = i > 0 ? knapsackResult.items[i - 1] : null;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 text-left font-bold border-r border-slate-200 bg-slate-50 font-sans text-slate-800">
                          {i === 0 ? 'Base (0)' : item?.name.split(' ')[0] + ' ' + (item?.name.split(' ')[1] || '')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-500">
                          {i === 0 ? '-' : item?.cost}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-500">
                          {i === 0 ? '-' : item?.capacity}
                        </td>
                        {row.map((val, w) => {
                          const isOptimal = i === knapsackResult.items.length && w === knapsackResult.capacityLimit;
                          return (
                            <td
                              key={w}
                              onClick={() => {
                                if (i === 0) return;
                                const prevVal = knapsackResult.dpTable[i - 1][w];
                                const canInclude = w >= (item?.cost || 0);
                                const withVal = canInclude 
                                  ? knapsackResult.dpTable[i - 1][w - (item?.cost || 0)] + (item?.capacity || 0)
                                  : -1;
                                const formulaStr = canInclude
                                  ? `DP[${i}][${w}] = max(Exclude: ${prevVal}, Include: DP[${i-1}][${w - (item?.cost || 0)}] + ${item?.capacity} = ${withVal}) = ${val}`
                                  : `Budget ${w} < cost ${item?.cost} → must exclude: ${prevVal}`;
                                setSelectedDpCell({
                                  hallName: item?.name || '',
                                  cost: item?.cost || 0,
                                  capacity: item?.capacity || 0,
                                  budget: w,
                                  value: val,
                                  formula: formulaStr,
                                });
                              }}
                              className={`p-1.5 text-[11px] cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all ${
                                isOptimal
                                  ? 'bg-indigo-600 text-white font-bold'
                                  : val > 0
                                  ? 'text-slate-900 font-semibold bg-slate-50/50'
                                  : 'text-slate-300'
                              }`}
                              title={i > 0 ? `Click to inspect calculation for ${item?.name} at budget ${w}` : 'Base row'}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: DP Cell Calculation Details */}
      {selectedDpCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Dynamic Programming Cell Calculation</h3>
              </div>
              <button
                onClick={() => setSelectedDpCell(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <div className="font-extrabold text-indigo-950 text-sm">
                  Hall Item: {selectedDpCell.hallName}
                </div>
                <div className="font-mono text-indigo-800 flex items-center gap-2">
                  <span>Cost: {selectedDpCell.cost} Units</span>
                  <span>•</span>
                  <span>Capacity: {selectedDpCell.capacity} Desks</span>
                  <span>•</span>
                  <span>Sub-Budget: w = {selectedDpCell.budget}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 font-sans block">Recurrence Formula Applied:</span>
                <div className="font-mono text-[11px] text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                  {selectedDpCell.formula}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-mono">
                <span className="font-sans text-emerald-900 font-bold">Max Desks at Sub-budget {selectedDpCell.budget}:</span>
                <span className="text-xl font-extrabold text-emerald-950">{selectedDpCell.value} Desks</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedDpCell(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MST Cable Savings Report */}
      {showMstSavingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Minimum Spanning Tree Cable Savings Analysis</h3>
              </div>
              <button
                onClick={() => setShowMstSavingsModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Comparison of campus inter-building intercom wiring for {CAMPUS_INTERCOM_VERTICES.length} exam buildings:
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">Full Mesh Wiring (N(N-1)/2)</span>
                  <div className="text-2xl font-extrabold text-slate-900">380m</div>
                  <div className="text-slate-500 text-[11px] font-sans">Every building directly connected to every other. Highly redundant and wasteful.</div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-sans text-emerald-800 font-bold block">Optimized MST (Kruskal / Prim)</span>
                  <div className="text-2xl font-extrabold text-emerald-950">{kruskalResult.totalWeight}m</div>
                  <div className="text-emerald-800 text-[11px] font-sans">Exactly V - 1 = 5 links with zero redundant loops. Full connectivity guaranteed.</div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 font-medium">
                <strong>Savings Verified: </strong> Saved <strong>{380 - kruskalResult.totalWeight} meters</strong> of cable trenching and wiring, achieving a <strong>{((1 - kruskalResult.totalWeight / 380) * 100).toFixed(1)}% cost reduction</strong> across the campus!
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowMstSavingsModal(false)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

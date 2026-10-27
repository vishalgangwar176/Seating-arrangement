/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Hall, Student, BranchCode, AlgorithmTrace } from '../types';
import { ActiveTab } from './Navbar';
import {
  allocateStudentsAcrossHalls,
  allocateStudentsPriorityQueue,
  generateConflictFreeSeating,
} from '../dsa/resourceAllocation';
import {
  Users,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronRight,
  GitBranch,
  Check,
  RefreshCw,
  Info,
  Sliders,
} from 'lucide-react';

interface BranchAllocationSectionProps {
  halls: Hall[];
  students: Student[];
  onApplyPlan?: (halls: Hall[], students: Student[]) => void;
  onSelectHall?: (hallId: string) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  onRecordTrace?: (trace: AlgorithmTrace) => void;
}

const FIRST_NAMES = [
  'Aarav', 'Diya', 'Rohan', 'Ananya', 'Vivaan', 'Isha', 'Aditya', 'Kavya',
  'Kabir', 'Tanvi', 'Aryan', 'Meera', 'Dhruv', 'Pooja', 'Arjun', 'Sneha',
  'Varun', 'Neha', 'Siddharth', 'Riya', 'Karan', 'Simran', 'Nikhil', 'Priya',
  'Harsh', 'Shreya', 'Manish', 'Komal', 'Abhishek', 'Ritika', 'Gaurav', 'Aditi'
];
const LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Verma', 'Singh', 'Reddy', 'Mehta', 'Nair',
  'Bose', 'Iyer', 'Deshmukh', 'Chopra', 'Joshi', 'Kapoor', 'Malhotra', 'Rao'
];

export const BranchAllocationSection: React.FC<BranchAllocationSectionProps> = ({
  halls,
  students,
  onApplyPlan,
  onSelectHall,
  setActiveTab,
  onRecordTrace,
}) => {
  // Configurable Branch Counts
  const [branchCounts, setBranchCounts] = useState<Record<BranchCode, number>>({
    CSE: 22,
    ECE: 16,
    MECH: 14,
    AIDS: 10,
    CIVIL: 0,
    IT: 0,
  });

  // Algorithm selection
  const [allocationStrategy, setAllocationStrategy] = useState<
    'multi_stage_dp' | 'priority_max_heap' | 'priority_min_heap'
  >('multi_stage_dp');

  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  // Total requested students
  const totalRequested = useMemo(() => {
    return Object.values(branchCounts).reduce((sum, n) => sum + n, 0);
  }, [branchCounts]);

  // Usable seats across all halls
  const totalUsableSeats = useMemo(() => {
    return halls.reduce((sum, h) => {
      return sum + h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
    }, 0);
  }, [halls]);

  // Generate synthetic students according to the configured branch counts
  const generatedStudents = useMemo(() => {
    const list: Student[] = [];
    const baseRolls: Record<BranchCode, number> = {
      CSE: 101,
      ECE: 201,
      MECH: 301,
      AIDS: 401,
      CIVIL: 501,
      IT: 601,
    };
    const subjects: Record<BranchCode, string> = {
      CSE: 'Design & Analysis of Algorithms',
      ECE: 'Digital Signal Processing',
      MECH: 'Thermodynamics & Heat Transfer',
      AIDS: 'Artificial Intelligence & Neural Nets',
      CIVIL: 'Structural Mechanics',
      IT: 'Cloud Computing & Distributed Systems',
    };

    let nameIdx = 0;
    (Object.keys(branchCounts) as BranchCode[]).forEach((branch) => {
      const count = branchCounts[branch];
      const startRoll = baseRolls[branch];
      const subject = subjects[branch];

      for (let i = 0; i < count; i++) {
        const fName = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
        const lName = LAST_NAMES[(nameIdx * 3) % LAST_NAMES.length];
        nameIdx++;

        list.push({
          rollNo: startRoll + i,
          name: `${fName} ${lName}`,
          branch,
          subject,
          semester: 4,
        });
      }
    });

    return list;
  }, [branchCounts]);

  // Automatically compute the allocation of these students across halls based on chosen DSA
  const allocationReport = useMemo(() => {
    const activeHalls = halls.filter((h) => h.isActive !== false);

    let hallAllocations = new Map<string, Student[]>();
    let dsaSteps: string[] = [];
    let algorithmName = '';
    let dsaRationale = '';

    if (allocationStrategy === 'multi_stage_dp') {
      algorithmName = 'Multi-Stage Resource Allocation (Dynamic Programming)';
      dsaRationale =
        'The DP algorithm minimizes branch variance: it distributes students of CSE, ECE, MECH, and AIDS proportionally across all rooms so every hall gets a diverse mix. Inside each hall, Planar Seat Graph Backtracking ensures no two students of the same department sit next to each other.';

      const res = allocateStudentsAcrossHalls(generatedStudents, activeHalls);
      hallAllocations = res.hallAllocations;
      dsaSteps = res.steps;
    } else {
      const isMax = allocationStrategy === 'priority_max_heap';
      algorithmName = isMax
        ? 'Max-Heap Priority Queue (Largest Hall First)'
        : 'Min-Heap Priority Queue (Smallest Hall First)';
      dsaRationale = isMax
        ? 'The Max-Heap extracts the room with largest remaining capacity (extractMax()) and fills it completely before opening the next room. This minimizes the total number of halls opened and reduces invigilation staffing.'
        : 'The Min-Heap extracts the smallest room first (extractMin()) to fill compact halls for closer invigilation before opening large halls.';

      const policy = isMax ? 'largest_first' : 'smallest_first';
      const res = allocateStudentsPriorityQueue(generatedStudents, activeHalls, policy);
      hallAllocations = res.hallAllocations;
      dsaSteps = res.steps;
    }

    // Compute detailed breakdown per hall
    const hallDetails = activeHalls.map((hall) => {
      const assigned = hallAllocations.get(hall.id) || [];
      const usable = hall.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;

      // Group assigned students by branch
      const branchSummary: Record<string, { count: number; rolls: number[]; sampleNames: string[] }> = {};
      assigned.forEach((st) => {
        if (!branchSummary[st.branch]) {
          branchSummary[st.branch] = { count: 0, rolls: [], sampleNames: [] };
        }
        branchSummary[st.branch].count++;
        branchSummary[st.branch].rolls.push(st.rollNo);
        if (branchSummary[st.branch].sampleNames.length < 3) {
          branchSummary[st.branch].sampleNames.push(st.name);
        }
      });

      return {
        hall,
        assignedCount: assigned.length,
        usableCapacity: usable,
        fillPercentage: usable > 0 ? Math.round((assigned.length / usable) * 100) : 0,
        branchSummary,
        assignedStudents: assigned,
      };
    });

    return {
      algorithmName,
      dsaRationale,
      hallDetails,
      dsaSteps,
      totalPlaced: generatedStudents.length,
    };
  }, [halls, generatedStudents, allocationStrategy]);

  // Adjust branch count
  const handleCountChange = (branch: BranchCode, delta: number) => {
    setBranchCounts((prev) => {
      const current = prev[branch];
      const next = Math.max(0, current + delta);
      return { ...prev, [branch]: next };
    });
    setAppliedMessage(null);
  };

  // Set explicit count
  const handleSetCount = (branch: BranchCode, value: number) => {
    setBranchCounts((prev) => ({
      ...prev,
      [branch]: Math.max(0, Math.min(100, isNaN(value) ? 0 : value)),
    }));
    setAppliedMessage(null);
  };

  // Preset Configurations
  const applyPreset = (preset: 'default' | 'equal' | 'heavy_cse' | 'compact') => {
    if (preset === 'default') {
      setBranchCounts({ CSE: 22, ECE: 16, MECH: 14, AIDS: 10, CIVIL: 0, IT: 0 });
    } else if (preset === 'equal') {
      setBranchCounts({ CSE: 16, ECE: 16, MECH: 16, AIDS: 16, CIVIL: 0, IT: 0 });
    } else if (preset === 'heavy_cse') {
      setBranchCounts({ CSE: 35, ECE: 12, MECH: 10, AIDS: 8, CIVIL: 0, IT: 0 });
    } else if (preset === 'compact') {
      setBranchCounts({ CSE: 10, ECE: 8, MECH: 6, AIDS: 6, CIVIL: 0, IT: 0 });
    }
    setAppliedMessage(null);
  };

  // Apply to Live Seating Plan
  const handleApplyToLiveSystem = () => {
    if (!onApplyPlan) return;

    const startTime = performance.now();
    const updatedHallsList: Hall[] = [];
    const updatedStudentsList: Student[] = [];

    // Place students into actual desks for each hall using conflict-free backtracking
    allocationReport.hallDetails.forEach(({ hall, assignedStudents }) => {
      const res = generateConflictFreeSeating(hall, assignedStudents, {
        enforceSameBranchSpacing: true,
        enforceSameSubjectSpacing: true,
      });

      updatedHallsList.push({ ...hall, seats: res.updatedSeats });
      updatedStudentsList.push(...res.assignedStudents);
    });

    onApplyPlan(updatedHallsList, updatedStudentsList);

    const msg = `Applied to Live Seating Plan! Placed ${updatedStudentsList.length} students across ${updatedHallsList.length} halls using ${allocationReport.algorithmName}.`;
    setAppliedMessage(msg);

    if (onRecordTrace) {
      onRecordTrace({
        id: `trace-branch-intake-${Date.now()}`,
        timestamp: new Date().toISOString(),
        algorithmName: allocationReport.algorithmName,
        unit: 'Unit 2 & 5: Heaps & Multi-Stage Resource Allocation DP',
        problemSolved: 'Automatically partitioned custom branch intake cohorts and assigned them to optimal examination halls.',
        timeComplexity: 'O(N log N) + O(R * C * K)',
        spaceComplexity: 'O(V + E) planar graph memory',
        inputSummary: `Placed ${totalRequested} students (${Object.entries(branchCounts).filter(([, c]) => c > 0).map(([b, c]) => `${b}:${c}`).join(', ')})`,
        executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
        operationCount: updatedStudentsList.length,
        steps: allocationReport.dsaSteps,
        resultSummary: msg,
      });
    }
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
      case 'CIVIL':
        return 'bg-sky-600 text-white';
      case 'IT':
        return 'bg-teal-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              AUTOMATIC BRANCH INTAKE &amp; HALL PLACEMENT
            </span>
            <span className="text-xs text-slate-500 font-medium">Data Structure Driven Allocation</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <span>Branch Student Cohort &amp; Hall Assignment</span>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-600">
              {totalRequested} Total Students
            </span>
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Write the number of examinees for each academic department below. Based on the selected data structure (<strong>Multi-Stage DP</strong> or <strong>Priority Queue</strong>), the computer automatically determines which exam halls they are placed in, balancing department ratios and preventing same-branch neighbor collisions.
          </p>
        </div>

        {/* Action: Apply to Live System */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleApplyToLiveSystem}
            disabled={totalRequested === 0 || totalRequested > totalUsableSeats}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Automatically place these students into the exam halls on the live seating map"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Apply Placement to Live Seating</span>
          </button>
        </div>
      </div>

      {/* Applied Confirmation Notice */}
      {appliedMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs text-emerald-950 flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-extrabold block">{appliedMessage}</span>
              <span className="text-slate-600 text-[11px]">
                You can now open the <strong>Seating Plan</strong> tab to inspect desks and print notice door sheets.
              </span>
            </div>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('seating')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs cursor-pointer shrink-0 transition-all"
            >
              View Seating Grid &rarr;
            </button>
          )}
        </div>
      )}

      {/* 1. Branch Count Input Cards */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>1. Write Number of Students Per Department:</span>
          </label>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
            <button
              onClick={() => applyPreset('default')}
              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              Default (62)
            </button>
            <button
              onClick={() => applyPreset('equal')}
              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              Equal (64)
            </button>
            <button
              onClick={() => applyPreset('heavy_cse')}
              className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg cursor-pointer border border-indigo-200"
            >
              High CSE (65)
            </button>
            <button
              onClick={() => applyPreset('compact')}
              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              Compact (30)
            </button>
          </div>
        </div>

        {/* 4 Main Department Input Steppers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['CSE', 'ECE', 'MECH', 'AIDS'] as BranchCode[]).map((branch) => {
            const count = branchCounts[branch];
            const colors: Record<string, { bg: string; border: string; text: string; fill: string }> = {
              CSE: { bg: 'bg-indigo-50/70', border: 'border-indigo-200', text: 'text-indigo-950', fill: 'bg-indigo-600' },
              ECE: { bg: 'bg-purple-50/70', border: 'border-purple-200', text: 'text-purple-950', fill: 'bg-purple-600' },
              MECH: { bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-950', fill: 'bg-amber-600' },
              AIDS: { bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-950', fill: 'bg-emerald-600' },
            };
            const c = colors[branch];

            return (
              <div
                key={branch}
                className={`p-4 rounded-2xl border ${c.border} ${c.bg} flex flex-col justify-between space-y-3 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-md ${getBranchBadge(branch)}`}>
                      {branch}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {branch === 'CSE'
                        ? 'Computer Science'
                        : branch === 'ECE'
                        ? 'Electronics'
                        : branch === 'MECH'
                        ? 'Mechanical'
                        : 'AI & Data Science'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-slate-900">{count}</span>
                    <span className="text-[10px] text-slate-400 block">students</span>
                  </div>
                </div>

                {/* Stepper Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleCountChange(branch, -5)}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all"
                    title="Decrease by 5"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => handleCountChange(branch, -1)}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all"
                    title="Decrease by 1"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => handleSetCount(branch, parseInt(e.target.value, 10))}
                    className="w-14 text-center py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono focus:ring-1 focus:ring-indigo-500"
                    min="0"
                    max="100"
                  />
                  <button
                    onClick={() => handleCountChange(branch, 1)}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all"
                    title="Increase by 1"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleCountChange(branch, 5)}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold font-mono cursor-pointer transition-all"
                    title="Increase by 5"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Capacity Warning or Summary */}
        <div className="flex flex-wrap items-center justify-between text-xs font-medium px-2 pt-1 text-slate-600">
          <div>
            Total Requested: <strong className="font-mono text-slate-900">{totalRequested}</strong> /{' '}
            <span className="text-slate-500">Usable Desks: {totalUsableSeats} across 4 halls</span>
          </div>
          <div>
            {totalRequested <= totalUsableSeats ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> All students fit comfortably ({Math.round((totalRequested / totalUsableSeats) * 100)}% load)
              </span>
            ) : (
              <span className="text-rose-700 font-bold">
                ⚠️ Exceeds total capacity by {totalRequested - totalUsableSeats} students! Reduce cohort counts.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Data Structure Algorithm Selector */}
      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <span>2. Underlying Data Structure &amp; Allocation Method:</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <label
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              allocationStrategy === 'multi_stage_dp'
                ? 'bg-white border-indigo-400 ring-2 ring-indigo-300 font-bold shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="branchAllocDsa"
              checked={allocationStrategy === 'multi_stage_dp'}
              onChange={() => setAllocationStrategy('multi_stage_dp')}
              className="mt-0.5 text-indigo-600"
            />
            <div>
              <span className="text-slate-900 block font-extrabold">Multi-Stage Resource Allocation (DP)</span>
              <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                Balances branch proportions across all rooms. No single room is overloaded with one branch.
              </span>
            </div>
          </label>

          <label
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              allocationStrategy === 'priority_max_heap'
                ? 'bg-white border-indigo-400 ring-2 ring-indigo-300 font-bold shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="branchAllocDsa"
              checked={allocationStrategy === 'priority_max_heap'}
              onChange={() => setAllocationStrategy('priority_max_heap')}
              className="mt-0.5 text-indigo-600"
            />
            <div>
              <span className="text-slate-900 block font-extrabold">Max-Heap Priority Queue (Largest Hall)</span>
              <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                Packs largest halls first to minimize opened rooms and economize on invigilator staffing.
              </span>
            </div>
          </label>

          <label
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              allocationStrategy === 'priority_min_heap'
                ? 'bg-white border-indigo-400 ring-2 ring-indigo-300 font-bold shadow-xs'
                : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="branchAllocDsa"
              checked={allocationStrategy === 'priority_min_heap'}
              onChange={() => setAllocationStrategy('priority_min_heap')}
              className="mt-0.5 text-indigo-600"
            />
            <div>
              <span className="text-slate-900 block font-extrabold">Min-Heap Priority Queue (Smallest Hall)</span>
              <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                Fills compact seminar halls first for close supervision before unlocking larger halls.
              </span>
            </div>
          </label>
        </div>

        {/* DSA Explanation Text */}
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2 mt-2">
          <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>How the Data Structure Decides:</strong> {allocationReport.dsaRationale}
          </p>
        </div>
      </div>

      {/* 3. Automatic Hall-by-Hall Placement Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>3. Automatic Placement Result: Where Each Student Is Placed</span>
          </label>
          <span className="text-[11px] text-slate-500 font-mono">
            Generated via {allocationReport.algorithmName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocationReport.hallDetails.map(({ hall, assignedCount, usableCapacity, fillPercentage, branchSummary }) => {
            const isUnused = assignedCount === 0;

            return (
              <div
                key={hall.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isUnused
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 shadow-xs hover:border-indigo-300'
                }`}
              >
                {/* Hall Title & Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{hall.name}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {hall.block} • Floor {hall.floor}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Room Capacity: <strong>{usableCapacity} usable desks</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold font-mono text-slate-900">
                      {assignedCount} / {usableCapacity}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block">
                      {isUnused ? 'Hall Kept Closed' : `${fillPercentage}% filled`}
                    </span>
                  </div>
                </div>

                {/* Capacity Fill Bar */}
                {!isUnused && (
                  <div className="my-3">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Branch Breakdown Inside this Hall */}
                {!isUnused ? (
                  <div className="space-y-2 mt-3 text-xs">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Students Placed in This Hall:
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(branchSummary).map(([branch, info]) => (
                        <div
                          key={branch}
                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-extrabold ${getBranchBadge(branch)}`}>
                              {branch}
                            </span>
                            <span className="font-extrabold font-mono text-slate-900">
                              {info.count} students
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            Rolls: #{info.rolls[0]}–#{info.rolls[info.rolls.length - 1]}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inspect Hall Desks Link */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          if (onSelectHall) onSelectHall(hall.id);
                          if (setActiveTab) setActiveTab('seating');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Seating Layout in {hall.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="font-bold text-slate-600">No students placed in this hall</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      The algorithm consolidated all students into the other halls to save energy and invigilation cost.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

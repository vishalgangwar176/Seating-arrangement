/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Hall, Seat, Student, ConflictInfo, AlgorithmTrace, SeatStatus } from '../types';
import {
  generateConflictFreeSeating,
  allocateStudentsAcrossHalls,
  allocateStudentsPriorityQueue,
  checkSeatPlacementConflict,
  findNearestSafeFreeSeat,
} from '../dsa/resourceAllocation';
import { SeatGraph } from '../dsa/graph';
import {
  Sparkles,
  Printer,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  ArrowLeftRight,
  RotateCcw,
  Trash2,
  UserPlus,
  UserMinus,
  Wrench,
  X,
  Check,
  Shuffle,
  Layers,
  HelpCircle,
  Building2,
  DoorOpen,
  Settings2,
  FileText,
} from 'lucide-react';

interface SeatingPlanViewProps {
  halls: Hall[];
  students: Student[];
  conflicts: ConflictInfo[];
  selectedHallId?: string;
  onSelectHall?: (hallId: string) => void;
  onUpdateHall?: (updatedHall: Hall) => void;
  onApplyGeneratedPlan: (updatedHalls: Hall[], updatedStudents: Student[]) => void;
  onRecordTrace: (trace: AlgorithmTrace) => void;
  onSwapSeats?: (hallId: string, seatId1: string, seatId2: string) => void;
  onAssignStudentToSeat?: (hallId: string, seatId: string, rollNo: number) => void;
  onUnassignSeat?: (hallId: string, seatId: string) => void;
  onToggleSeatStatus?: (hallId: string, seatId: string, nextStatus: SeatStatus) => void;
  onClearAllSeating?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export const SeatingPlanView: React.FC<SeatingPlanViewProps> = ({
  halls,
  students,
  conflicts,
  selectedHallId: externalHallId,
  onSelectHall: externalOnSelectHall,
  onUpdateHall,
  onApplyGeneratedPlan,
  onRecordTrace,
  onSwapSeats,
  onAssignStudentToSeat,
  onUnassignSeat,
  onToggleSeatStatus,
  onClearAllSeating,
  onUndo,
  canUndo = false,
}) => {
  const [internalHallId, setInternalHallId] = useState<string>(halls[0]?.id || '');
  const activeHallId = externalHallId || internalHallId;
  const setActiveHallId = externalOnSelectHall || setInternalHallId;

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Generator Wizard Modal state
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [selectedHallsForGen, setSelectedHallsForGen] = useState<string[]>(() => halls.map((h) => h.id));
  const [allocationMode, setAllocationMode] = useState<'multi_stage_dp' | 'priority_max_heap' | 'priority_min_heap'>('multi_stage_dp');
  const [enforceBranchSpacing, setEnforceBranchSpacing] = useState(true);
  const [enforceSubjectSpacing, setEnforceSubjectSpacing] = useState(true);
  const [shuffleCandidates, setShuffleCandidates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDsaDetails, setShowDsaDetails] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  // Manual Swap Mode State
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [swapSourceSeat, setSwapSourceSeat] = useState<Seat | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Dropdown candidate selection for manual assignment
  const [selectedRollToAssign, setSelectedRollToAssign] = useState<number | ''>('');
  const [isDoorSheetModalOpen, setIsDoorSheetModalOpen] = useState(false);

  const activeHall = useMemo(
    () => halls.find((h) => h.id === activeHallId) || halls[0],
    [halls, activeHallId]
  );

  const studentMap = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.rollNo, s));
    return map;
  }, [students]);

  const activeSeatGraph = useMemo(() => new SeatGraph(activeHall), [activeHall]);

  const { components } = useMemo(
    () => activeSeatGraph.findConnectedComponents(),
    [activeSeatGraph]
  );

  // Conflict seat IDs
  const conflictSeatIds = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((c) => {
      set.add(c.seatId1);
      set.add(c.seatId2);
    });
    return set;
  }, [conflicts]);

  // Unassigned candidates
  const unassignedStudents = useMemo(
    () => students.filter((s) => !s.assignedSeatId),
    [students]
  );

  // Selected student
  const selectedStudent = selectedSeat?.studentRoll
    ? studentMap.get(selectedSeat.studentRoll)
    : null;

  // Selected seat orthogonal neighbors
  const selectedSeatNeighbors = useMemo(() => {
    if (!selectedSeat) return [];
    const neighborIds = activeSeatGraph.getNeighbors(selectedSeat.id);
    return neighborIds.map((nId) => {
      const seat = activeHall.seats.find((s) => s.id === nId);
      const student = seat?.studentRoll ? studentMap.get(seat.studentRoll) : null;
      let hasConflict = false;
      if (selectedStudent && student) {
        if (selectedStudent.branch === student.branch || selectedStudent.subject === student.subject) {
          hasConflict = true;
        }
      }
      return { seatId: nId, seat, student, hasConflict };
    });
  }, [selectedSeat, activeSeatGraph, activeHall, selectedStudent, studentMap]);

  // Branch badge color mapping
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

  // Helper notice timer
  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // Execute Seating Plan Generation
  const handleExecuteGeneration = () => {
    setIsGenerating(true);
    const startTime = performance.now();

    const targetHalls = halls.filter((h) => selectedHallsForGen.includes(h.id));
    const excludedHalls = halls.filter((h) => !selectedHallsForGen.includes(h.id));

    let candidatePool = [...students];
    if (shuffleCandidates) {
      // Fisher-Yates shuffle
      for (let i = candidatePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidatePool[i], candidatePool[j]] = [candidatePool[j], candidatePool[i]];
      }
    }

    const updatedHallsList: Hall[] = [];
    let updatedStudentsList: Student[] = [];
    const allSteps: string[] = [];
    let totalConflicts = 0;

    let algorithmDisplayName = 'Multi-Stage Resource Allocation (DP)';
    let timeComplexityStr = 'O(N log N) + O(R * C * K)';

    if (allocationMode === 'multi_stage_dp') {
      algorithmDisplayName = 'Multi-Stage Resource Allocation (DP)';
      timeComplexityStr = 'O(N log N) + O(R * C * K)';
      const { hallAllocations, steps: allocSteps } = allocateStudentsAcrossHalls(candidatePool, targetHalls);
      allSteps.push(...allocSteps);

      targetHalls.forEach((hall) => {
        const pool = hallAllocations.get(hall.id) || [];
        const res = generateConflictFreeSeating(hall, pool, {
          enforceSameBranchSpacing: enforceBranchSpacing,
          enforceSameSubjectSpacing: enforceSubjectSpacing,
        });

        updatedHallsList.push({ ...hall, seats: res.updatedSeats });
        updatedStudentsList.push(...res.assignedStudents);
        allSteps.push(...res.steps);
        totalConflicts += res.conflictsDetected;
      });
    } else {
      const policy = allocationMode === 'priority_max_heap' ? 'largest_first' : 'smallest_first';
      algorithmDisplayName = allocationMode === 'priority_max_heap'
        ? 'Max-Heap Priority Queue (Largest Hall First)'
        : 'Min-Heap Priority Queue (Smallest Hall First)';
      timeComplexityStr = 'O(H log H) + O(R * C * K)';

      const { hallAllocations, steps: heapSteps } = allocateStudentsPriorityQueue(candidatePool, targetHalls, policy);
      allSteps.push(...heapSteps);

      targetHalls.forEach((hall) => {
        const pool = hallAllocations.get(hall.id) || [];
        const res = generateConflictFreeSeating(hall, pool, {
          enforceSameBranchSpacing: enforceBranchSpacing,
          enforceSameSubjectSpacing: enforceSubjectSpacing,
        });

        updatedHallsList.push({ ...hall, seats: res.updatedSeats });
        updatedStudentsList.push(...res.assignedStudents);
        allSteps.push(...res.steps);
        totalConflicts += res.conflictsDetected;
      });
    }

    // Excluded halls retain unassigned/vacated status
    excludedHalls.forEach((hall) => {
      updatedHallsList.push({
        ...hall,
        seats: hall.seats.map((s) => ({
          ...s,
          status: s.status === 'aisle' ? 'aisle' : s.status === 'blocked' ? 'blocked' : 'free',
          studentRoll: undefined,
        })),
      });
    });

    // Mark remaining unplaced candidates
    const assignedRolls = new Set(updatedStudentsList.map((s) => s.rollNo));
    students.forEach((s) => {
      if (!assignedRolls.has(s.rollNo)) {
        updatedStudentsList.push({ ...s, assignedHallId: undefined, assignedSeatId: undefined });
      }
    });

    onApplyGeneratedPlan(updatedHallsList, updatedStudentsList);
    setIsGenerating(false);
    setIsGenModalOpen(false);

    const seatedCount = updatedStudentsList.filter((s) => s.assignedSeatId).length;
    const duration = Number((performance.now() - startTime).toFixed(2));

    const notice = `Generated Seating Plan! ${seatedCount}/${students.length} candidates seated across ${targetHalls.length} halls with ${totalConflicts} conflicts.`;
    setGenerationMessage(notice);
    triggerNotice(notice);

    onRecordTrace({
      id: `trace-seating-gen-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: algorithmDisplayName,
      unit: 'Anti-Malpractice Placement',
      problemSolved: 'Automatically interleave students across rooms so neighbors belong to different departments or subjects.',
      timeComplexity: timeComplexityStr,
      spaceComplexity: 'O(V + E) memory',
      inputSummary: `${students.length} candidates placed across ${targetHalls.length} selected halls`,
      executionTimeMs: duration,
      operationCount: seatedCount,
      steps: allSteps.slice(0, 10),
      resultSummary: notice,
    });
  };

  // Click on a seat in the hall grid
  const handleSeatClick = (seat: Seat) => {
    // If in Swap Mode
    if (isSwapMode) {
      if (!swapSourceSeat) {
        setSwapSourceSeat(seat);
        triggerNotice(`Desk 1 selected (${seat.id}). Now click the destination desk to swap.`);
      } else if (swapSourceSeat.id === seat.id) {
        // Deselect
        setSwapSourceSeat(null);
        triggerNotice(`Deselected Desk ${seat.id}.`);
      } else {
        // Perform Swap
        if (onSwapSeats) {
          onSwapSeats(activeHall.id, swapSourceSeat.id, seat.id);
          const roll1 = swapSourceSeat.studentRoll ? `#${swapSourceSeat.studentRoll}` : 'Empty';
          const roll2 = seat.studentRoll ? `#${seat.studentRoll}` : 'Empty';
          triggerNotice(`Swapped Desk ${swapSourceSeat.id} (${roll1}) with Desk ${seat.id} (${roll2})!`);
        }
        setSwapSourceSeat(null);
        setIsSwapMode(false);
        setSelectedSeat(seat);
      }
      return;
    }

    // Normal selection
    setSelectedSeat(seat);
  };

  // Start Swap Mode for a specific desk
  const handleStartSwapForSeat = (seat: Seat) => {
    setIsSwapMode(true);
    setSwapSourceSeat(seat);
    triggerNotice(`Swap Mode Active: Desk ${seat.id} selected. Click any target desk on the grid to complete the swap.`);
  };

  // Cancel Swap Mode
  const handleCancelSwap = () => {
    setIsSwapMode(false);
    setSwapSourceSeat(null);
    triggerNotice('Swap mode canceled.');
  };

  // Assign candidate to selected seat
  const handleAssignCandidate = () => {
    if (!selectedSeat || !selectedRollToAssign || !onAssignStudentToSeat) return;
    onAssignStudentToSeat(activeHall.id, selectedSeat.id, Number(selectedRollToAssign));
    triggerNotice(`Candidate #${selectedRollToAssign} assigned to Desk ${selectedSeat.id}.`);
    setSelectedRollToAssign('');
  };

  // Unassign student from selected seat
  const handleUnseat = () => {
    if (!selectedSeat || !onUnassignSeat) return;
    const prevRoll = selectedSeat.studentRoll;
    onUnassignSeat(activeHall.id, selectedSeat.id);
    triggerNotice(`Examinee #${prevRoll} unseated and moved to unassigned waiting list.`);
    setSelectedSeat({ ...selectedSeat, status: 'free', studentRoll: undefined });
  };

  // Toggle status of selected seat
  const handleToggleStatus = (nextStatus: SeatStatus) => {
    if (!selectedSeat || !onToggleSeatStatus) return;
    onToggleSeatStatus(activeHall.id, selectedSeat.id, nextStatus);
    setSelectedSeat({
      ...selectedSeat,
      status: nextStatus,
      studentRoll: nextStatus === 'occupied' ? selectedSeat.studentRoll : undefined,
    });
    triggerNotice(`Desk ${selectedSeat.id} status changed to ${nextStatus.toUpperCase()}.`);
  };

  // Auto-seat next unassigned candidate into nearest safe desk
  const handleAutoSeatNext = () => {
    if (unassignedStudents.length === 0 || !onAssignStudentToSeat) return;
    const nextStudent = unassignedStudents[0];
    const safeSeat = findNearestSafeFreeSeat(activeHall, nextStudent, studentMap);

    if (safeSeat) {
      onAssignStudentToSeat(activeHall.id, safeSeat.id, nextStudent.rollNo);
      triggerNotice(`Auto-seated #${nextStudent.rollNo} (${nextStudent.branch}) into Desk ${safeSeat.id}.`);
      setSelectedSeat(safeSeat);
    } else {
      triggerNotice(`No free desk available in ${activeHall.name}. Switch to another hall.`);
    }
  };

  // Capacity calculations for generator modal
  const selectedCapacities = useMemo(() => {
    return halls
      .filter((h) => selectedHallsForGen.includes(h.id))
      .reduce((sum, h) => {
        return sum + h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
      }, 0);
  }, [halls, selectedHallsForGen]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Generation & Change Tools */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              EXAMINATION SEATING SYSTEM
            </span>
            <span className="text-xs text-slate-500 font-medium">Generate, Adjust &amp; Print</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Exam Seating Plan &amp; Hall Layout
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Generate anti-cheating seating plans with automated department interleaving, or manually swap and change desk assignments with real-time neighbor clash verification.
          </p>
        </div>

        {/* 3 Prominent Primary Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsDoorSheetModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Preview attendance door sheet with desk IDs and candidates"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Door Sheet Preview</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Print formal door sheet for examination hall"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Door Chart</span>
          </button>

          <button
            onClick={() => setIsGenModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm cursor-pointer"
            title="Configure and generate a new seating plan"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Generate Seating Plan</span>
          </button>
        </div>
      </div>

      {/* Floating / Inline Action Notice */}
      {actionNotice && (
        <div className="no-print bg-indigo-900 text-white px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-md transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 hover:bg-white/20 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Plan Changing & Editing Toolbar */}
      <div className="no-print bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" />
              <span>Change &amp; Edit Seating:</span>
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Adjust desks, swap candidates, or resolve emergency hall changes.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-Seat Next Waiting Candidate */}
            <button
              onClick={handleAutoSeatNext}
              disabled={unassignedStudents.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              title="Automatically seat next unplaced examinee in nearest safe desk"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Auto-Seat Next ({unassignedStudents.length} wait)</span>
            </button>

            {/* Swap Mode Toggle */}
            <button
              onClick={() => {
                if (isSwapMode) handleCancelSwap();
                else setIsSwapMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isSwapMode
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title="Click two desks in the hall to swap their candidates"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isSwapMode ? 'Exit Swap Mode' : 'Swap Two Desks'}</span>
            </button>

            {/* Undo Last Change */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Undo last manual desk swap or assignment"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Change</span>
            </button>

            {/* Clear All Seating */}
            <button
              onClick={() => {
                if (confirm('Clear all assigned seats across all halls? This resets desks to free state.')) {
                  if (onClearAllSeating) onClearAllSeating();
                  setSelectedSeat(null);
                  triggerNotice('Cleared all desk allocations. All candidates are in the waiting pool.');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 transition-all cursor-pointer"
              title="Vacate all desks to test generation from scratch"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Desks</span>
            </button>
          </div>
        </div>

        {/* Swap Mode Banner */}
        {isSwapMode && (
          <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-amber-200">
                {swapSourceSeat
                  ? `Desk 1 Selected: ${swapSourceSeat.id} (${
                      swapSourceSeat.studentRoll ? `Roll #${swapSourceSeat.studentRoll}` : 'Empty'
                    }). Click the destination desk to complete swap.`
                  : 'Click the 1st desk on the layout grid below, then click the 2nd desk.'}
              </span>
            </div>
            <button
              onClick={handleCancelSwap}
              className="px-2.5 py-1 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Unassigned Students Alert & Quick-Seat Button */}
        {unassignedStudents.length > 0 && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold">
                {unassignedStudents.length} Unassigned Candidates
              </span>
              <span className="text-slate-300 text-[11px] truncate max-w-md">
                {unassignedStudents
                  .slice(0, 5)
                  .map((s) => `#${s.rollNo} (${s.branch})`)
                  .join(', ')}
                {unassignedStudents.length > 5 ? ` +${unassignedStudents.length - 5} more` : ''}
              </span>
            </div>

            <button
              onClick={handleAutoSeatNext}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer"
              title="Automatically find the nearest clash-free desk for the next unassigned candidate"
            >
              <UserPlus className="w-3 h-3" />
              <span>Auto-Seat Next Candidate</span>
            </button>
          </div>
        )}
      </div>

      {/* Hall Navigation Tabs + Department Highlight + Legend */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Hall Selection Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {halls.map((h) => {
              const seated = h.seats.filter((s) => s.status === 'occupied').length;
              const usable = h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
              return (
                <button
                  key={h.id}
                  onClick={() => {
                    setActiveHallId(h.id);
                    setSelectedSeat(null);
                    if (isSwapMode) handleCancelSwap();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    activeHallId === h.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{h.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activeHallId === h.id ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {seated}/{usable}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Department Color Highlighter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Highlight:</span>
            </span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold"
            >
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE Only (Blue)</option>
              <option value="ECE">ECE Only (Purple)</option>
              <option value="MECH">MECH Only (Amber)</option>
              <option value="AIDS">AIDS Only (Green)</option>
            </select>
          </div>
        </div>

        {/* Interactive Legend with Live Filtering */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-semibold text-[11px] mr-0.5">Filter / Quick Counts:</span>
            
            <button
              onClick={() => {
                const count = activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'CSE').length;
                const next = branchFilter === 'CSE' ? 'ALL' : 'CSE';
                setBranchFilter(next);
                triggerNotice(next === 'CSE' ? `Filtered to CSE: ${count} examinees seated in ${activeHall.name}.` : 'Reset filter to all departments.');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
                branchFilter === 'CSE' ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
              }`}
              title="Filter and highlight CSE examinees"
            >
              <span className="w-3 h-3 rounded bg-indigo-600 text-white inline-flex items-center justify-center text-[8px] font-bold">C</span>
              <span>CSE ({activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'CSE').length})</span>
            </button>

            <button
              onClick={() => {
                const count = activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'ECE').length;
                const next = branchFilter === 'ECE' ? 'ALL' : 'ECE';
                setBranchFilter(next);
                triggerNotice(next === 'ECE' ? `Filtered to ECE: ${count} examinees seated in ${activeHall.name}.` : 'Reset filter to all departments.');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
                branchFilter === 'ECE' ? 'bg-purple-600 text-white border-purple-700 shadow-xs' : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200'
              }`}
              title="Filter and highlight ECE examinees"
            >
              <span className="w-3 h-3 rounded bg-purple-600 text-white inline-flex items-center justify-center text-[8px] font-bold">E</span>
              <span>ECE ({activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'ECE').length})</span>
            </button>

            <button
              onClick={() => {
                const count = activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'MECH').length;
                const next = branchFilter === 'MECH' ? 'ALL' : 'MECH';
                setBranchFilter(next);
                triggerNotice(next === 'MECH' ? `Filtered to MECH: ${count} examinees seated in ${activeHall.name}.` : 'Reset filter to all departments.');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
                branchFilter === 'MECH' ? 'bg-amber-600 text-white border-amber-700 shadow-xs' : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
              }`}
              title="Filter and highlight MECH examinees"
            >
              <span className="w-3 h-3 rounded bg-amber-600 text-white inline-flex items-center justify-center text-[8px] font-bold">M</span>
              <span>MECH ({activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'MECH').length})</span>
            </button>

            <button
              onClick={() => {
                const count = activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'AIDS').length;
                const next = branchFilter === 'AIDS' ? 'ALL' : 'AIDS';
                setBranchFilter(next);
                triggerNotice(next === 'AIDS' ? `Filtered to AIDS: ${count} examinees seated in ${activeHall.name}.` : 'Reset filter to all departments.');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
                branchFilter === 'AIDS' ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
              }`}
              title="Filter and highlight AIDS examinees"
            >
              <span className="w-3 h-3 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[8px] font-bold">A</span>
              <span>AIDS ({activeHall.seats.filter((s) => s.status === 'occupied' && studentMap.get(s.studentRoll || -1)?.branch === 'AIDS').length})</span>
            </button>

            <button
              onClick={() => {
                const hallSeatIds = new Set(activeHall.seats.map((s) => s.id));
                const hallConflicts = conflicts.filter((c) => hallSeatIds.has(c.seatId1) || hallSeatIds.has(c.seatId2));
                triggerNotice(`Neighbor Clash Audit: ${hallConflicts.length} clashing desk pairs in ${activeHall.name}. Red highlighted borders show collisions.`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-all cursor-pointer"
              title="Check neighbor collision desks"
            >
              <span className="w-3 h-3 rounded bg-red-200 border border-red-500 inline-block" />
              <span className="font-bold">
                Clashes ({conflicts.filter((c) => activeHall.seats.some((s) => s.id === c.seatId1 || s.id === c.seatId2)).length})
              </span>
            </button>

            <button
              onClick={() => {
                const broken = activeHall.seats.filter((s) => s.status === 'blocked').length;
                triggerNotice(`Broken Desks: ${broken} damaged desks in ${activeHall.name}. These are excluded from placement.`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all cursor-pointer"
              title="Inspect broken desks"
            >
              <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400 inline-block" />
              <span>Broken ({activeHall.seats.filter((s) => s.status === 'blocked').length})</span>
            </button>

            <button
              onClick={() => {
                const aisles = activeHall.seats.filter((s) => s.status === 'aisle').length;
                triggerNotice(`Walking Aisles: ${aisles} aisle paths in ${activeHall.name} isolating seating blocks.`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
              title="Inspect walking aisles"
            >
              <span className="w-3 h-3 rounded bg-slate-200 border border-dashed border-slate-400 inline-block" />
              <span>Aisles ({activeHall.seats.filter((s) => s.status === 'aisle').length})</span>
            </button>
          </div>

          <button
            onClick={() => setShowDsaDetails(!showDsaDetails)}
            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>{showDsaDetails ? 'Hide Algorithm Notes' : 'How the Computer Solves This'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable DSA Explanation */}
        {showDsaDetails && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 mt-2">
            <h4 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider">
              Data Structures &amp; Algorithms Used on This Screen:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700 text-xs">
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <strong className="text-indigo-900 block">1. Planar Seat Graph</strong>
                Every usable desk is a vertex. Left, right, front, and back physical neighbors are edges in an Adjacency List.
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <strong className="text-indigo-900 block">2. Connected Components</strong>
                Center walking aisles break the graph into separate seating wings ({components.length} wings detected) for invigilator zones.
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <strong className="text-indigo-900 block">3. Backtracking Interleaving</strong>
                Candidates are placed one-by-one by checking neighbor constraints. If a collision occurs, candidates are swapped.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid & Desk Inspector Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 seat-map-container">
        {/* Left 2 Cols: Seating Map Grid */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>{activeHall.name}</span>
                <span className="text-xs font-normal text-slate-500">
                  ({activeHall.block}, Floor {activeHall.floor})
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isSwapMode
                  ? 'Click two desks to swap them. The system immediately validates neighbor anti-cheating rules.'
                  : 'Click any desk to view candidate info and change seating. Double-click to toggle desk status.'}
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold">
              {activeHall.rows} Rows × {activeHall.cols} Columns
            </span>
          </div>

          {/* Teacher Dais / Blackboard Front */}
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-center text-xs font-extrabold text-slate-700 uppercase tracking-widest font-mono shadow-2xs">
            [ FRONT • TEACHER&apos;S DAIS &amp; BLACKBOARD ]
          </div>

          {/* Grid Render */}
          <div className="overflow-x-auto py-2">
            <div
              className="grid gap-2.5 justify-center"
              style={{
                gridTemplateColumns: `repeat(${activeHall.cols}, minmax(4.8rem, 6rem))`,
              }}
            >
              {activeHall.seats.map((seat) => {
                const isAisle = seat.status === 'aisle';
                const isBlocked = seat.status === 'blocked';
                const isOccupied = seat.status === 'occupied';
                const isConflict = conflictSeatIds.has(seat.id);
                const isSelected = selectedSeat?.id === seat.id;
                const isSwapSource = swapSourceSeat?.id === seat.id;
                const student = seat.studentRoll ? studentMap.get(seat.studentRoll) : null;

                const isDimmed = branchFilter !== 'ALL' && student && student.branch !== branchFilter;

                let bgClass = 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50';
                if (isAisle) {
                  bgClass = 'bg-slate-100 border-dashed border-slate-300 text-slate-400';
                } else if (isBlocked) {
                  bgClass = 'bg-amber-50 border-amber-300 text-amber-800';
                } else if (isConflict) {
                  bgClass = 'bg-red-50 border-red-500 text-red-900 shadow-xs ring-2 ring-red-400';
                } else if (isOccupied) {
                  bgClass = 'bg-slate-900 border-slate-950 text-white shadow-xs';
                }

                if (isSelected && !isSwapMode) {
                  bgClass += ' ring-3 ring-indigo-500 ring-offset-2';
                }

                if (isSwapSource) {
                  bgClass += ' ring-4 ring-amber-400 ring-offset-2 animate-pulse scale-[1.02] shadow-md';
                } else if (isSwapMode) {
                  bgClass += ' hover:ring-2 hover:ring-amber-300 cursor-pointer';
                }

                if (isDimmed) {
                  bgClass += ' opacity-30';
                }

                return (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    onDoubleClick={() => {
                      if (onToggleSeatStatus) {
                        let next: SeatStatus = 'free';
                        if (seat.status === 'free') next = 'blocked';
                        else if (seat.status === 'blocked') next = 'aisle';
                        else if (seat.status === 'aisle') next = 'free';
                        else if (seat.status === 'occupied') next = 'blocked';
                        onToggleSeatStatus(activeHall.id, seat.id, next);
                      }
                    }}
                    className={`h-20 rounded-xl border flex flex-col items-center justify-between p-2 text-center transition-all cursor-pointer ${bgClass}`}
                    title={
                      student
                        ? `Desk ${seat.id}: ${student.name} (Roll #${student.rollNo}, ${student.branch})`
                        : `Desk ${seat.id}: ${seat.status}`
                    }
                  >
                    <div className="flex items-center justify-between w-full text-[10px] font-mono opacity-70 font-bold">
                      <span>
                        R{seat.row + 1}C{seat.col + 1}
                      </span>
                      {isConflict && <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />}
                      {isSwapSource && (
                        <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded font-bold">1st</span>
                      )}
                    </div>

                    {isOccupied && student ? (
                      <div className="space-y-1 my-auto w-full">
                        <div className="font-extrabold text-xs font-mono leading-tight">#{student.rollNo}</div>
                        <div
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-extrabold inline-block shadow-2xs ${getBranchBadge(
                            student.branch
                          )}`}
                        >
                          {student.branch}
                        </div>
                      </div>
                    ) : isBlocked ? (
                      <span className="text-[10px] font-bold text-amber-700">Broken Desk</span>
                    ) : isAisle ? (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Aisle</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">Available</span>
                    )}

                    <div className="text-[9px] font-medium opacity-70 truncate w-full text-center">
                      {student ? student.name.split(' ')[0] : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between text-xs font-mono text-slate-400 px-4 border-t border-slate-100 pt-3">
            <span>[ Main Entrance Door ]</span>
            <span>[ Emergency Exit Door ]</span>
          </div>
        </div>

        {/* Right Col: Desk Inspector & Manual Action Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Desk Inspection &amp; Adjustments</span>
            </h3>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
              {selectedSeat ? selectedSeat.id : 'Click a desk'}
            </span>
          </div>

          {selectedSeat ? (
            <div className="space-y-4 text-xs">
              {/* Selected Desk Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 uppercase font-semibold text-[10px]">Location</span>
                  <span className="font-mono font-bold text-slate-900">
                    Row {selectedSeat.row + 1}, Col {selectedSeat.col + 1} ({activeHall.name})
                  </span>
                </div>

                {selectedStudent ? (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Candidate:</span>
                      <span className="font-extrabold text-slate-900">{selectedStudent.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Roll Number:</span>
                      <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        #{selectedStudent.rollNo}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] ${getBranchBadge(
                          selectedStudent.branch
                        )}`}
                      >
                        {selectedStudent.branch}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Subject:</span>
                      <span className="text-slate-700 font-medium">{selectedStudent.subject}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic pt-1">
                    Status: <strong className="uppercase">{selectedSeat.status}</strong> (No candidate assigned)
                  </div>
                )}
              </div>

              {/* Direct Seating Actions */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                  Modify This Desk:
                </span>

                {selectedSeat.status === 'occupied' && selectedStudent && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStartSwapForSeat(selectedSeat)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold cursor-pointer transition-all"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Swap Desk</span>
                    </button>

                    <button
                      onClick={handleUnseat}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl font-bold cursor-pointer transition-all"
                    >
                      <UserMinus className="w-3.5 h-3.5 text-rose-700" />
                      <span>Unassign</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus('blocked')}
                      className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold cursor-pointer transition-all"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-700" />
                      <span>Mark Broken (Move Candidate to Pool)</span>
                    </button>
                  </div>
                )}

                {selectedSeat.status === 'free' && (
                  <div className="space-y-2">
                    {unassignedStudents.length > 0 ? (
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-600 block">
                          Seat an Unassigned Candidate:
                        </label>
                        <select
                          value={selectedRollToAssign}
                          onChange={(e) => setSelectedRollToAssign(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="">-- Choose Candidate --</option>
                          {unassignedStudents.map((st) => {
                            const { hasConflict } = checkSeatPlacementConflict(
                              activeHall,
                              selectedSeat.id,
                              st,
                              studentMap
                            );
                            return (
                              <option key={st.rollNo} value={st.rollNo}>
                                #{st.rollNo} - {st.name} ({st.branch}) {hasConflict ? '⚠️ Clash' : '✅ Safe'}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          onClick={handleAssignCandidate}
                          disabled={!selectedRollToAssign}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs cursor-pointer transition-all"
                        >
                          Assign to This Desk
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">
                        All registered candidates are currently assigned.
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus('aisle')}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Set as Aisle
                      </button>
                      <button
                        onClick={() => handleToggleStatus('blocked')}
                        className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Set as Broken
                      </button>
                    </div>
                  </div>
                )}

                {selectedSeat.status === 'blocked' && (
                  <button
                    onClick={() => handleToggleStatus('free')}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold cursor-pointer transition-all"
                  >
                    Repair &amp; Mark Usable (Free)
                  </button>
                )}

                {selectedSeat.status === 'aisle' && (
                  <button
                    onClick={() => handleToggleStatus('free')}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl font-bold cursor-pointer transition-all"
                  >
                    Convert Aisle to Usable Desk
                  </button>
                )}
              </div>

              {/* Neighbors Inspection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Direct Orthogonal Neighbors ({selectedSeatNeighbors.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Front, Back, Left, Right</span>
                </div>

                {selectedSeatNeighbors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSeatNeighbors.map((nb) => (
                      <div
                        key={nb.seatId}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          nb.hasConflict
                            ? 'bg-red-50 border-red-300 text-red-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold flex items-center gap-1.5">
                            <span>{nb.seatId.split('-')[1]}</span>
                            {nb.student && (
                              <span className="text-[11px] font-normal text-slate-600">({nb.student.name})</span>
                            )}
                          </div>
                          {nb.student ? (
                            <div className="text-[11px] text-slate-500 font-mono">
                              Roll #{nb.student.rollNo} • {nb.student.branch} • {nb.student.subject}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">{nb.seat?.status || 'Empty desk'}</div>
                          )}
                        </div>

                        <div>
                          {nb.hasConflict ? (
                            <span className="text-[10px] font-extrabold text-red-800 bg-red-100 px-2 py-0.5 rounded-md">
                              Collision!
                            </span>
                          ) : nb.student ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                              Safe
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Empty</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    This desk has no direct orthogonal neighbors (surrounded by aisles).
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Eye className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Click Any Desk on the Grid</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                Inspect examinee details, swap seats, unseat candidates, or verify that all 4 neighbors are from different departments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Printable Door Sheet (visible during print) */}
      <div className="hidden print:block print:p-6 space-y-6">
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            COLLEGE EXAMINATION BOARD — SEATING CHART
          </h1>
          <p className="text-sm font-medium mt-1">
            Hall: <strong>{activeHall.name}</strong> • Block: <strong>{activeHall.block}</strong> • Floor: <strong>{activeHall.floor}</strong>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Date of Examination: {new Date().toLocaleDateString()} • Session: Morning
          </p>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 p-2 text-left">Desk ID</th>
              <th className="border border-slate-400 p-2 text-left">Roll No</th>
              <th className="border border-slate-400 p-2 text-left">Candidate Name</th>
              <th className="border border-slate-400 p-2 text-left">Department</th>
              <th className="border border-slate-400 p-2 text-left">Subject</th>
              <th className="border border-slate-400 p-2 text-center">Signature</th>
            </tr>
          </thead>
          <tbody>
            {activeHall.seats
              .filter((s) => s.status === 'occupied' && s.studentRoll)
              .map((s) => {
                const cand = studentMap.get(s.studentRoll!);
                return (
                  <tr key={s.id}>
                    <td className="border border-slate-400 p-2 font-mono font-bold">{s.id}</td>
                    <td className="border border-slate-400 p-2 font-mono">#{cand?.rollNo}</td>
                    <td className="border border-slate-400 p-2 font-bold">{cand?.name}</td>
                    <td className="border border-slate-400 p-2 font-mono">{cand?.branch}</td>
                    <td className="border border-slate-400 p-2">{cand?.subject}</td>
                    <td className="border border-slate-400 p-2 w-32"></td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        <div className="flex justify-between items-center pt-12 text-xs">
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-1" />
            <span>Invigilator Signature</span>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-1" />
            <span>Chief Superintendent Signature</span>
          </div>
        </div>
      </div>

      {/* PLAN GENERATOR MODAL WIZARD */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Generate Examination Seating Plan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose rooms, strategy, and anti-cheating spacing rules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGenModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Examination Halls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>1. Select Halls to Include</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Capacity: {selectedCapacities} Desks / {students.length} Candidates
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {halls.map((h) => {
                  const usable = h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
                  const isChecked = selectedHallsForGen.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHallsForGen((prev) => [...prev, h.id]);
                          } else {
                            if (selectedHallsForGen.length <= 1) {
                              alert('At least one examination hall must be selected.');
                              return;
                            }
                            setSelectedHallsForGen((prev) => prev.filter((id) => id !== h.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div>{h.name}</div>
                        <div className="text-[10px] font-normal text-slate-500 font-mono">
                          {usable} usable desks • {h.block}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Allocation Algorithm Strategy */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>2. Select Optimization Algorithm</span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                <label
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                    allocationMode === 'multi_stage_dp'
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocationMode"
                    checked={allocationMode === 'multi_stage_dp'}
                    onChange={() => setAllocationMode('multi_stage_dp')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">
                      Multi-Stage Resource Allocation (Dynamic Programming)
                    </span>
                    <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                      Distributes all departments (CSE, ECE, MECH, AIDS) evenly across all halls to ensure high diversity in every room.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                    allocationMode === 'priority_max_heap'
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocationMode"
                    checked={allocationMode === 'priority_max_heap'}
                    onChange={() => setAllocationMode('priority_max_heap')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">
                      Max-Heap Priority Queue (Largest Halls First)
                    </span>
                    <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                      Fills the largest halls first to minimize total rooms and economize on invigilator staffing.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                    allocationMode === 'priority_min_heap'
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="allocationMode"
                    checked={allocationMode === 'priority_min_heap'}
                    onChange={() => setAllocationMode('priority_min_heap')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">
                      Min-Heap Priority Queue (Smallest Halls First)
                    </span>
                    <span className="text-[11px] font-normal text-slate-600 block mt-0.5">
                      Fills compact seminar halls first for closer supervision before opening the main hall.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 3: Anti-Cheating Spacing Rules */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                3. Anti-Cheating Spacing Constraints:
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceBranchSpacing}
                    onChange={(e) => setEnforceBranchSpacing(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-800 font-medium">
                    Enforce Different Departments (adjacent desks cannot share same branch)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceSubjectSpacing}
                    onChange={(e) => setEnforceSubjectSpacing(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-800 font-medium">
                    Enforce Different Subjects (adjacent desks cannot write the same exam paper)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleCandidates}
                    onChange={(e) => setShuffleCandidates(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-slate-800 font-medium">
                    Randomize Candidate Order (shuffle roll numbers before allocation)
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsGenModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteGeneration}
                disabled={isGenerating || selectedCapacities < students.length}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isGenerating ? 'Computing Plan...' : 'Generate Seating Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DOOR SHEET PREVIEW MODAL */}
      {isDoorSheetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Hall Door Attendance Sheet</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeHall.name} ({activeHall.block}, Floor {activeHall.floor})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
                <button
                  onClick={() => setIsDoorSheetModalOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="border-b border-slate-300 pb-3 text-center space-y-1">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Autonomous College Examination Cell</div>
                <div className="text-base font-extrabold text-slate-900">Official Candidate Door Seating Chart</div>
                <div className="text-xs font-mono text-slate-600">
                  Venue: {activeHall.name} | Block: {activeHall.block} | Floor: {activeHall.floor}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3">Desk ID</th>
                      <th className="py-2 px-3">Roll No</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3 text-center">Invigilator Sign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {activeHall.seats
                      .filter((s) => s.status === 'occupied' && s.studentRoll)
                      .map((seat) => {
                        const student = studentMap.get(seat.studentRoll!);
                        return (
                          <tr key={seat.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{seat.id}</td>
                            <td className="py-2 px-3 font-bold text-indigo-700">{student?.rollNo}</td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800">{student?.name}</td>
                            <td className="py-2 px-3 font-bold">{student?.branch}</td>
                            <td className="py-2 px-3 font-sans text-slate-600">{student?.subject}</td>
                            <td className="py-2 px-3 border-l border-slate-200 w-28 text-center text-slate-300">
                              __________
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="text-slate-500 text-[11px] flex justify-between pt-2">
                <span>Total Seated: {activeHall.seats.filter((s) => s.status === 'occupied').length} examinees</span>
                <span>Exam Controller Signature: _______________</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

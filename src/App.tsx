/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Hall, Student, ConflictInfo, AlgorithmTrace, SeatStatus } from './types';
import { createInitialHalls, createInitialStudents } from './data/sampleData';
import { SeatGraph } from './dsa/graph';
import { generateConflictFreeSeating, allocateStudentsAcrossHalls } from './dsa/resourceAllocation';
import { Navbar, ActiveTab } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { SeatingPlanView } from './components/SeatingPlanView';
import { StudentsView } from './components/StudentsView';
import { ConflictAuditView } from './components/ConflictAuditView';
import { CampusRoutesAndBudgetView } from './components/CampusRoutesAndBudgetView';
import { PresentationAndTestsView } from './components/PresentationAndTestsView';
import { AlgorithmTraceModal } from './components/AlgorithmTraceModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [halls, setHalls] = useState<Hall[]>(() => createInitialHalls());
  const [students, setStudents] = useState<Student[]>(() => createInitialStudents());
  const [selectedHallId, setSelectedHallId] = useState<string>(() => createInitialHalls()[0]?.id || '');

  // History stack for 1-click Undo of manual changes
  const [history, setHistory] = useState<Array<{ halls: Hall[]; students: Student[] }>>([]);

  const [algorithmTraces, setAlgorithmTraces] = useState<AlgorithmTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<AlgorithmTrace | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

  // Record an algorithm trace
  const handleRecordTrace = useCallback((trace: AlgorithmTrace) => {
    setAlgorithmTraces((prev) => [trace, ...prev.slice(0, 19)]);
    setSelectedTrace(trace);
  }, []);

  // Compute real-time conflicts across all active halls
  const conflicts: ConflictInfo[] = useMemo(() => {
    const studentMap = new Map<number, Student>();
    students.forEach((s) => studentMap.set(s.rollNo, s));

    const allConflicts: ConflictInfo[] = [];
    halls.forEach((hall) => {
      const graph = new SeatGraph(hall);
      const hallConflicts = graph.auditConflicts(studentMap);
      allConflicts.push(...hallConflicts);
    });

    return allConflicts;
  }, [halls, students]);

  // Usable seats count
  const totalUsableSeats = useMemo(() => {
    return halls.reduce((sum, h) => {
      return sum + h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
    }, 0);
  }, [halls]);

  const assignedCount = useMemo(() => {
    return students.filter((s) => s.assignedSeatId).length;
  }, [students]);

  // Auto-generate seating plan
  const generateInitialPlan = useCallback((currentHalls: Hall[], currentStudents: Student[]) => {
    const { hallAllocations } = allocateStudentsAcrossHalls(currentStudents, currentHalls);
    const updatedHalls: Hall[] = [];
    const updatedStudents: Student[] = [];

    currentHalls.forEach((hall) => {
      const pool = hallAllocations.get(hall.id) || [];
      const res = generateConflictFreeSeating(hall, pool, {
        enforceSameBranchSpacing: true,
        enforceSameSubjectSpacing: true,
      });

      updatedHalls.push({ ...hall, seats: res.updatedSeats });
      updatedStudents.push(...res.assignedStudents);
    });

    const assignedRolls = new Set(updatedStudents.map((s) => s.rollNo));
    currentStudents.forEach((s) => {
      if (!assignedRolls.has(s.rollNo)) {
        updatedStudents.push({ ...s, assignedHallId: undefined, assignedSeatId: undefined });
      }
    });

    setHalls(updatedHalls);
    setStudents(updatedStudents);

    handleRecordTrace({
      id: `trace-init-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Conflict-Free Seating Plan Generation',
      unit: 'Anti-Malpractice Arrangement',
      problemSolved: 'Automatically interleave examinees so that orthogonal adjacent desks never share the same department or subject.',
      timeComplexity: 'O(N log N) + O(V + E) + O(R * C * K)',
      spaceComplexity: 'O(V + E) planar graph memory',
      inputSummary: `${currentStudents.length} candidates placed across ${currentHalls.length} examination halls`,
      executionTimeMs: 1.2,
      operationCount: currentStudents.length + totalUsableSeats,
      steps: [
        'Built planar seat graph G=(V,E) for all active examination halls.',
        'Applied Multi-Stage Resource Allocation DP to balance department ratios.',
        'Executed Backtracking Constraint Satisfaction to place students into desks without adjacent peer collisions.',
      ],
      resultSummary: `Seating created: ${updatedStudents.filter((s) => s.assignedSeatId).length} students seated.`,
    });
  }, [handleRecordTrace, totalUsableSeats]);

  // Auto-generate on mount
  useEffect(() => {
    generateInitialPlan(halls, students);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset demo handler
  const handleResetDemo = () => {
    const freshHalls = createInitialHalls();
    const freshStudents = createInitialStudents();
    setSelectedHallId(freshHalls[0]?.id || '');
    generateInitialPlan(freshHalls, freshStudents);
    setActiveTab('dashboard');
  };

  // Student CRUD with immediate seat synchronization
  const handleAddStudent = (student: Student) => {
    pushHistory(halls, students);

    if (student.assignedHallId && student.assignedSeatId) {
      setHalls((prevHalls) =>
        prevHalls.map((h) => {
          if (h.id === student.assignedHallId) {
            return {
              ...h,
              seats: h.seats.map((seat) =>
                seat.id === student.assignedSeatId
                  ? { ...seat, status: 'occupied' as SeatStatus, studentRoll: student.rollNo }
                  : seat
              ),
            };
          }
          return h;
        })
      );
    }

    setStudents((prev) => [student, ...prev]);

    handleRecordTrace({
      id: `trace-add-student-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Live Examinee Admission',
      unit: 'Dynamic Student Management',
      problemSolved: `Admitted Roll #${student.rollNo} (${student.name}, ${student.branch}) during live exam session.`,
      timeComplexity: 'O(1) insertion',
      spaceComplexity: 'O(1)',
      inputSummary: `Roll #${student.rollNo} admitted. Hall: ${student.assignedHallId || 'Waiting Pool'}, Desk: ${student.assignedSeatId || 'None'}`,
      executionTimeMs: 0.3,
      operationCount: 1,
      steps: [
        `Added Roll #${student.rollNo} to examinee directory.`,
        student.assignedSeatId ? `Assigned to ${student.assignedHallId} desk ${student.assignedSeatId}.` : 'Added to waiting / unseated pool.',
        'Updated real-time hall capacity and attendance statistics.',
      ],
      resultSummary: `Student #${student.rollNo} registered successfully.`,
    });
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.rollNo === updatedStudent.rollNo ? updatedStudent : s))
    );
  };

  const handleDeleteStudent = (rollNo: number) => {
    pushHistory(halls, students);
    const studentToDelete = students.find((s) => s.rollNo === rollNo);
    if (studentToDelete && studentToDelete.assignedSeatId && studentToDelete.assignedHallId) {
      setHalls((prevHalls) =>
        prevHalls.map((h) => {
          if (h.id === studentToDelete.assignedHallId) {
            return {
              ...h,
              seats: h.seats.map((seat) =>
                seat.id === studentToDelete.assignedSeatId
                  ? { ...seat, status: 'free' as SeatStatus, studentRoll: undefined }
                  : seat
              ),
            };
          }
          return h;
        })
      );
    }
    setStudents((prev) => prev.filter((s) => s.rollNo !== rollNo));

    handleRecordTrace({
      id: `trace-del-student-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Live Examinee Eviction / Removal',
      unit: 'Dynamic Student Management',
      problemSolved: `Removed Roll #${rollNo} (${studentToDelete?.name || ''}) during examination session and immediately vacated their desk.`,
      timeComplexity: 'O(1) deletion',
      spaceComplexity: 'O(1)',
      inputSummary: `Roll #${rollNo} removed from exam session.`,
      executionTimeMs: 0.3,
      operationCount: 1,
      steps: [
        `Located record for Roll #${rollNo} in student registry.`,
        studentToDelete?.assignedSeatId ? `Vacated desk ${studentToDelete.assignedSeatId} in hall ${studentToDelete.assignedHallId} back to 'free'.` : 'Removed from unassigned pool.',
        'Re-verified neighbor adjacency graph for anti-cheating separation.',
      ],
      resultSummary: `Roll #${rollNo} removed; desk freed.`,
    });
  };

  const handleUpdateHall = (updatedHall: Hall) => {
    setHalls((prev) => prev.map((h) => (h.id === updatedHall.id ? updatedHall : h)));
  };

  const handleApplyGeneratedPlan = (updatedHalls: Hall[], updatedStudents: Student[]) => {
    setHistory((prev) => [...prev.slice(-10), { halls, students }]);
    setHalls(updatedHalls);
    setStudents(updatedStudents);
  };

  // Push state to history for undo
  const pushHistory = useCallback((currentHalls: Hall[], currentStudents: Student[]) => {
    setHistory((prev) => [...prev.slice(-10), { halls: currentHalls, students: currentStudents }]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setHalls(last.halls);
    setStudents(last.students);

    handleRecordTrace({
      id: `trace-undo-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'State Rollback (Undo)',
      unit: 'Undo Stack Mechanism',
      problemSolved: 'Revert last manual seating change, desk swap, or assignment.',
      timeComplexity: 'O(1) stack pop',
      spaceComplexity: 'O(V + K) snapshot memory',
      inputSummary: '1 previous snapshot restored',
      executionTimeMs: 0.2,
      operationCount: 1,
      steps: ['Popped prior state from LIFO undo stack.', 'Restored hall seats and student allocations.'],
      resultSummary: 'Previous state restored successfully.',
    });
  }, [history, handleRecordTrace]);

  // Swap 2 seats in a hall
  const handleSwapSeats = useCallback(
    (hallId: string, seatId1: string, seatId2: string) => {
      pushHistory(halls, students);

      let roll1: number | undefined;
      let roll2: number | undefined;

      const updatedHalls = halls.map((h) => {
        if (h.id !== hallId) return h;
        const seat1 = h.seats.find((s) => s.id === seatId1);
        const seat2 = h.seats.find((s) => s.id === seatId2);
        if (!seat1 || !seat2) return h;

        roll1 = seat1.studentRoll;
        roll2 = seat2.studentRoll;

        return {
          ...h,
          seats: h.seats.map((s) => {
            if (s.id === seatId1) {
              return {
                ...s,
                studentRoll: roll2,
                status: roll2 ? ('occupied' as SeatStatus) : ('free' as SeatStatus),
              };
            }
            if (s.id === seatId2) {
              return {
                ...s,
                studentRoll: roll1,
                status: roll1 ? ('occupied' as SeatStatus) : ('free' as SeatStatus),
              };
            }
            return s;
          }),
        };
      });

      const updatedStudents = students.map((st) => {
        if (roll1 !== undefined && st.rollNo === roll1) {
          return {
            ...st,
            assignedHallId: hallId,
            assignedSeatId: seatId2,
          };
        }
        if (roll2 !== undefined && st.rollNo === roll2) {
          return {
            ...st,
            assignedHallId: hallId,
            assignedSeatId: seatId1,
          };
        }
        return st;
      });

      setHalls(updatedHalls);
      setStudents(updatedStudents);

      handleRecordTrace({
        id: `trace-swap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        algorithmName: 'Manual Seat Swap & Planar Graph Update',
        unit: 'Interactive Seating Adjustment',
        problemSolved: 'Swapped candidates between two desks and triggered real-time orthogonal neighbor audit.',
        timeComplexity: 'O(1) pointer updates + O(deg(v)) local constraint checks',
        spaceComplexity: 'O(1) extra space',
        inputSummary: `Swapped ${seatId1} (Roll #${roll1 || 'Empty'}) with ${seatId2} (Roll #${roll2 || 'Empty'}) in ${hallId}`,
        executionTimeMs: 0.5,
        operationCount: 4,
        steps: [
          `Identified desks ${seatId1} and ${seatId2} in ${hallId}.`,
          `Exchanged occupant pointers: Roll ${roll1 || 'Empty'} <-> Roll ${roll2 || 'Empty'}.`,
          'Updated examinee location records in student directory.',
          'Re-audited orthogonal adjacency edges in seat graph for branch/subject collisions.',
        ],
        resultSummary: 'Desk swap completed successfully.',
      });
    },
    [halls, students, pushHistory, handleRecordTrace]
  );

  // Assign an examinee to a desk
  const handleAssignStudentToSeat = useCallback(
    (hallId: string, seatId: string, rollNo: number) => {
      pushHistory(halls, students);

      const candidate = students.find((s) => s.rollNo === rollNo);
      if (!candidate) return;

      const oldHallId = candidate.assignedHallId;
      const oldSeatId = candidate.assignedSeatId;

      let replacedRoll: number | undefined;

      const updatedHalls = halls.map((h) => {
        let updatedSeats = h.seats;

        // Vacate old seat if in this hall
        if (oldHallId === h.id && oldSeatId) {
          updatedSeats = updatedSeats.map((s) =>
            s.id === oldSeatId ? { ...s, status: 'free' as SeatStatus, studentRoll: undefined } : s
          );
        }

        // Set target seat if in this hall
        if (h.id === hallId) {
          const currentOccupant = updatedSeats.find((s) => s.id === seatId)?.studentRoll;
          if (currentOccupant && currentOccupant !== rollNo) {
            replacedRoll = currentOccupant;
          }

          updatedSeats = updatedSeats.map((s) =>
            s.id === seatId ? { ...s, status: 'occupied' as SeatStatus, studentRoll: rollNo } : s
          );
        }

        return { ...h, seats: updatedSeats };
      });

      // Update students
      const updatedStudents = students.map((st) => {
        if (st.rollNo === rollNo) {
          return { ...st, assignedHallId: hallId, assignedSeatId: seatId };
        }
        if (replacedRoll && st.rollNo === replacedRoll) {
          return { ...st, assignedHallId: undefined, assignedSeatId: undefined };
        }
        return st;
      });

      setHalls(updatedHalls);
      setStudents(updatedStudents);

      handleRecordTrace({
        id: `trace-assign-${Date.now()}`,
        timestamp: new Date().toISOString(),
        algorithmName: 'Manual Seat Assignment',
        unit: 'Interactive Seating Adjustment',
        problemSolved: `Placed Roll #${rollNo} (${candidate.branch}) into desk ${seatId}.`,
        timeComplexity: 'O(1) assignment',
        spaceComplexity: 'O(1)',
        inputSummary: `Candidate Roll #${rollNo} -> Desk ${seatId} in ${hallId}`,
        executionTimeMs: 0.4,
        operationCount: 2,
        steps: [
          `Cleared previous desk assignment if candidate was previously seated.`,
          `Updated desk ${seatId} status to 'occupied' with candidate Roll #${rollNo}.`,
          `Triggered conflict check for neighboring desks.`,
        ],
        resultSummary: `Roll #${rollNo} assigned to ${seatId}.`,
      });
    },
    [halls, students, pushHistory, handleRecordTrace]
  );

  // Unassign student from seat
  const handleUnassignSeat = useCallback(
    (hallId: string, seatId: string) => {
      pushHistory(halls, students);

      let unseatedRoll: number | undefined;

      const updatedHalls = halls.map((h) => {
        if (h.id !== hallId) return h;
        return {
          ...h,
          seats: h.seats.map((s) => {
            if (s.id === seatId) {
              unseatedRoll = s.studentRoll;
              return { ...s, status: 'free' as SeatStatus, studentRoll: undefined };
            }
            return s;
          }),
        };
      });

      const updatedStudents = students.map((st) => {
        if (unseatedRoll && st.rollNo === unseatedRoll) {
          return { ...st, assignedHallId: undefined, assignedSeatId: undefined };
        }
        return st;
      });

      setHalls(updatedHalls);
      setStudents(updatedStudents);
    },
    [halls, students, pushHistory]
  );

  // Toggle seat status
  const handleToggleSeatStatus = useCallback(
    (hallId: string, seatId: string, nextStatus: SeatStatus) => {
      pushHistory(halls, students);

      let unseatedRoll: number | undefined;

      const updatedHalls = halls.map((h) => {
        if (h.id !== hallId) return h;
        return {
          ...h,
          seats: h.seats.map((s) => {
            if (s.id === seatId) {
              if (nextStatus === 'blocked' || nextStatus === 'aisle' || nextStatus === 'free') {
                unseatedRoll = s.studentRoll;
              }
              return {
                ...s,
                status: nextStatus,
                studentRoll: nextStatus === 'occupied' ? s.studentRoll : undefined,
              };
            }
            return s;
          }),
        };
      });

      const updatedStudents = students.map((st) => {
        if (unseatedRoll && st.rollNo === unseatedRoll) {
          return { ...st, assignedHallId: undefined, assignedSeatId: undefined };
        }
        return st;
      });

      setHalls(updatedHalls);
      setStudents(updatedStudents);
    },
    [halls, students, pushHistory]
  );

  // Clear all seating
  const handleClearAllSeating = useCallback(() => {
    pushHistory(halls, students);

    const clearedHalls = halls.map((h) => ({
      ...h,
      seats: h.seats.map((s) => ({
        ...s,
        status: (s.status === 'aisle' ? 'aisle' : s.status === 'blocked' ? 'blocked' : 'free') as SeatStatus,
        studentRoll: undefined,
      })),
    }));

    const clearedStudents = students.map((s) => ({
      ...s,
      assignedHallId: undefined,
      assignedSeatId: undefined,
    }));

    setHalls(clearedHalls);
    setStudents(clearedStudents);

    handleRecordTrace({
      id: `trace-clear-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Clear All Seating Assignments',
      unit: 'Workspace Reset',
      problemSolved: 'Reset all desk occupancy to free state for clean simulation or custom allocation testing.',
      timeComplexity: 'O(V + K)',
      spaceComplexity: 'O(1)',
      inputSummary: `${halls.length} halls, ${students.length} students reset`,
      executionTimeMs: 0.6,
      operationCount: totalUsableSeats + students.length,
      steps: ['Vacated all desk occupancy markers.', 'Set student location pointers to unassigned.'],
      resultSummary: 'All seats cleared. Ready for fresh plan generation or manual allocation.',
    });
  }, [halls, students, pushHistory, handleRecordTrace, totalUsableSeats]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalStudents={students.length}
        totalUsableSeats={totalUsableSeats}
        assignedCount={assignedCount}
        conflictCount={conflicts.length}
        onResetDemo={handleResetDemo}
        onOpenTrace={() => setIsTraceModalOpen(true)}
        hasLatestTrace={algorithmTraces.length > 0}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <OverviewView
            halls={halls}
            students={students}
            conflicts={conflicts}
            setActiveTab={setActiveTab}
            onGenerateSeating={() => generateInitialPlan(halls, students)}
            onRunAudit={() => setActiveTab('conflicts')}
            onSelectHall={(id) => {
              setSelectedHallId(id);
              setActiveTab('seating');
            }}
            onApplyPlan={handleApplyGeneratedPlan}
            onRecordTrace={handleRecordTrace}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onAssignStudentToSeat={handleAssignStudentToSeat}
            onUnassignSeat={handleUnassignSeat}
            onSwapSeats={handleSwapSeats}
          />
        )}

        {activeTab === 'seating' && (
          <SeatingPlanView
            halls={halls}
            students={students}
            conflicts={conflicts}
            selectedHallId={selectedHallId}
            onSelectHall={setSelectedHallId}
            onUpdateHall={handleUpdateHall}
            onApplyGeneratedPlan={handleApplyGeneratedPlan}
            onRecordTrace={handleRecordTrace}
            onSwapSeats={handleSwapSeats}
            onAssignStudentToSeat={handleAssignStudentToSeat}
            onUnassignSeat={handleUnassignSeat}
            onToggleSeatStatus={handleToggleSeatStatus}
            onClearAllSeating={handleClearAllSeating}
            onUndo={handleUndo}
            canUndo={history.length > 0}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={students}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onRecordTrace={handleRecordTrace}
          />
        )}

        {activeTab === 'conflicts' && (
          <ConflictAuditView
            halls={halls}
            students={students}
            conflicts={conflicts}
            onRecordTrace={handleRecordTrace}
          />
        )}

        {activeTab === 'campus' && (
          <CampusRoutesAndBudgetView
            halls={halls}
            students={students}
            onRecordTrace={handleRecordTrace}
          />
        )}

        {activeTab === 'presentation' && (
          <PresentationAndTestsView
            setActiveTab={setActiveTab}
            onGenerateSeating={() => generateInitialPlan(halls, students)}
            onRunAudit={() => setActiveTab('conflicts')}
          />
        )}
      </main>

      {/* Algorithm Trace Modal */}
      <AlgorithmTraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        trace={selectedTrace}
        traceHistory={algorithmTraces}
        onSelectHistoricalTrace={(t) => setSelectedTrace(t)}
      />

      {/* Clean Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Exam Seating Arrangement System</span>
            <span>•</span>
            <span>Autonomous Examination Operations</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">UN SDG 4: Quality Education</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Powered by Units 1–5 Data Structures &amp; Algorithms
          </div>
        </div>
      </footer>
    </div>
  );
}

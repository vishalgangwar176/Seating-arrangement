/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Hall, Student, ConflictInfo, AlgorithmTrace, Seat } from '../types';
import { ActiveTab } from './Navbar';
import { BranchAllocationSection } from './BranchAllocationSection';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  GraduationCap, 
  ShieldCheck, 
  Navigation,
  FileText,
  Search,
  Check,
  Cpu,
  X,
  Printer,
  ChevronRight,
  UserPlus,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
  Move,
  Clock,
  CheckCircle,
  Info
} from 'lucide-react';

export interface OverviewViewProps {
  halls: Hall[];
  students: Student[];
  conflicts: ConflictInfo[];
  setActiveTab: (tab: ActiveTab) => void;
  onGenerateSeating: () => void;
  onRunAudit: () => void;
  onSelectHall: (hallId: string) => void;
  onApplyPlan?: (halls: Hall[], students: Student[]) => void;
  onRecordTrace?: (trace: AlgorithmTrace) => void;
  onAddStudent?: (student: Student) => void;
  onDeleteStudent?: (rollNo: number) => void;
  onAssignStudentToSeat?: (hallId: string, seatId: string, rollNo: number) => void;
  onUnassignSeat?: (hallId: string, seatId: string) => void;
  onSwapSeats?: (hallId: string, seatId1: string, seatId2: string) => void;
}

// Subject recommendations per department
const DEPT_SUBJECTS: Record<string, string> = {
  CSE: 'Data Structures & Algorithms',
  ECE: 'Digital Signal Processing',
  MECH: 'Fluid Dynamics & Thermodynamics',
  AIDS: 'Machine Learning & Neural Nets',
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  halls,
  students,
  conflicts,
  setActiveTab,
  onGenerateSeating,
  onRunAudit,
  onSelectHall,
  onApplyPlan,
  onRecordTrace,
  onAddStudent,
  onDeleteStudent,
  onAssignStudentToSeat,
  onUnassignSeat,
}) => {
  // Modal states for KPI cards and interactions
  const [activeKpiModal, setActiveKpiModal] = useState<'examinees' | 'desks' | 'seated' | 'conflicts' | null>(null);
  const [selectedDeptModal, setSelectedDeptModal] = useState<string | null>(null);
  const [doorSheetHall, setDoorSheetHall] = useState<Hall | null>(null);

  // Live Exam Candidate Management States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'seated' | 'unseated'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [hallFilter, setHallFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newRollNo, setNewRollNo] = useState<number>(() => {
    const maxRoll = students.length > 0 ? Math.max(...students.map((s) => s.rollNo)) : 1000;
    return maxRoll + 1;
  });
  const [newName, setNewName] = useState('');
  const [newBranch, setNewBranch] = useState<'CSE' | 'ECE' | 'MECH' | 'AIDS'>('CSE');
  const [newSubject, setNewSubject] = useState(DEPT_SUBJECTS['CSE']);
  const [placementMode, setPlacementMode] = useState<'auto' | 'manual' | 'waiting'>('auto');
  const [manualHallId, setManualHallId] = useState<string>(halls[0]?.id || '');
  const [manualSeatId, setManualSeatId] = useState<string>('');

  // Move / Change Seat Modal State
  const [studentToMove, setStudentToMove] = useState<Student | null>(null);
  const [targetHallId, setTargetHallId] = useState<string>('');
  const [targetSeatId, setTargetSeatId] = useState<string>('');

  // Delete Confirmation Modal State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Live Action Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const totalUsableSeats = useMemo(() => {
    return halls.reduce((sum, h) => {
      return sum + h.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
    }, 0);
  }, [halls]);

  const assignedStudents = useMemo(() => students.filter((s) => s.assignedSeatId), [students]);
  const unassignedStudents = useMemo(() => students.filter((s) => !s.assignedSeatId), [students]);
  const fillRate = totalUsableSeats > 0 ? Math.round((assignedStudents.length / totalUsableSeats) * 100) : 0;

  const branchCounts = useMemo(() => {
    return students.reduce((acc, s) => {
      acc[s.branch] = (acc[s.branch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [students]);

  const studentMap = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.rollNo, s));
    return map;
  }, [students]);

  // Set of roll numbers currently in a conflict pair
  const conflictRollSet = useMemo(() => {
    const set = new Set<number>();
    conflicts.forEach((c) => {
      set.add(c.student1.rollNo);
      set.add(c.student2.rollNo);
    });
    return set;
  }, [conflicts]);

  // Helper: check if placing a branch/subject at seat causes neighbor collision
  const checkSeatClashes = (hall: Hall, seat: Seat, branch: string, subject: string) => {
    const reasons: string[] = [];
    const neighbors = hall.seats.filter(
      (s) =>
        s.status === 'occupied' &&
        s.studentRoll &&
        s.id !== seat.id &&
        ((Math.abs(s.row - seat.row) === 1 && s.col === seat.col) ||
          (Math.abs(s.col - seat.col) === 1 && s.row === seat.row))
    );

    for (const n of neighbors) {
      const neighborStudent = studentMap.get(n.studentRoll!);
      if (neighborStudent) {
        if (neighborStudent.branch === branch) {
          reasons.push(`Adjacent to ${neighborStudent.name} (Roll #${neighborStudent.rollNo}, ${branch}) at ${n.id}`);
        }
        if (neighborStudent.subject === subject) {
          reasons.push(`Adjacent to ${neighborStudent.name} taking ${subject}`);
        }
      }
    }
    return { isConflictFree: reasons.length === 0, reasons };
  };

  // Helper: find best conflict-free desk across all halls
  const findConflictFreeSeat = (branch: string, subject: string) => {
    let bestFallback: { hall: Hall; seat: Seat; reasons: string[] } | null = null;

    for (const hall of halls) {
      const freeSeats = hall.seats.filter((s) => s.status === 'free');
      for (const seat of freeSeats) {
        const { isConflictFree, reasons } = checkSeatClashes(hall, seat, branch, subject);
        if (isConflictFree) {
          return { hall, seat, isConflictFree: true, reasons: [] };
        }
        if (!bestFallback) {
          bestFallback = { hall, seat, reasons };
        }
      }
    }
    return bestFallback ? { ...bestFallback, isConflictFree: false } : null;
  };

  // Filtered examinees list for dashboard table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesRoll = s.rollNo.toString().includes(q);
        const matchesBranch = s.branch.toLowerCase().includes(q);
        const matchesSubject = s.subject.toLowerCase().includes(q);
        const matchesHall = s.assignedHallId?.toLowerCase().includes(q);
        const matchesSeat = s.assignedSeatId?.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesBranch && !matchesSubject && !matchesHall && !matchesSeat) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'seated' && !s.assignedSeatId) return false;
      if (statusFilter === 'unseated' && s.assignedSeatId) return false;

      // Department filter
      if (deptFilter !== 'all' && s.branch !== deptFilter) return false;

      // Hall filter
      if (hallFilter !== 'all') {
        if (hallFilter === 'unassigned') {
          if (s.assignedHallId) return false;
        } else {
          if (s.assignedHallId !== hallFilter) return false;
        }
      }

      return true;
    });
  }, [students, searchQuery, statusFilter, deptFilter, hallFilter]);

  // Paginated examinees
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Handle Auto-Seat single student
  const handleAutoSeatSingle = (student: Student) => {
    const candidateSeat = findConflictFreeSeat(student.branch, student.subject);
    if (!candidateSeat) {
      showToast(`No free usable desks available across any examination hall!`, 'error');
      return;
    }

    if (onAssignStudentToSeat) {
      onAssignStudentToSeat(candidateSeat.hall.id, candidateSeat.seat.id, student.rollNo);
      showToast(
        `Roll #${student.rollNo} (${student.name}) auto-seated into ${candidateSeat.hall.name} Desk ${candidateSeat.seat.id} (${candidateSeat.isConflictFree ? '100% Conflict-Free' : 'Placed in best available desk'}).`,
        'success'
      );
    }
  };

  // Handle Auto-Seat All Waiting
  const handleAutoSeatAllWaiting = () => {
    if (unassignedStudents.length === 0) {
      showToast('All registered examinees are already seated at desks!', 'info');
      return;
    }

    let seatedCount = 0;
    unassignedStudents.forEach((st) => {
      const candidateSeat = findConflictFreeSeat(st.branch, st.subject);
      if (candidateSeat && onAssignStudentToSeat) {
        onAssignStudentToSeat(candidateSeat.hall.id, candidateSeat.seat.id, st.rollNo);
        seatedCount++;
      }
    });

    if (seatedCount > 0) {
      showToast(`Auto-seated ${seatedCount} waiting examinees into conflict-free desks!`, 'success');
    } else {
      showToast('No free desks available to place waiting candidates.', 'error');
    }
  };

  // Handle Unseat Examinee (moves to waiting pool without deleting record)
  const handleUnseatExaminee = (student: Student) => {
    if (!student.assignedHallId || !student.assignedSeatId) return;
    if (onUnassignSeat) {
      onUnassignSeat(student.assignedHallId, student.assignedSeatId);
      showToast(`Roll #${student.rollNo} (${student.name}) moved to Waiting Pool. Desk ${student.assignedSeatId} vacated.`, 'info');
    }
  };

  // Handle Open Add Student Modal
  const handleOpenAddModal = () => {
    const nextRoll = students.length > 0 ? Math.max(...students.map((s) => s.rollNo)) + 1 : 1001;
    setNewRollNo(nextRoll);
    setNewName('');
    setNewBranch('CSE');
    setNewSubject(DEPT_SUBJECTS['CSE']);
    setPlacementMode('auto');
    setManualHallId(halls[0]?.id || '');
    setManualSeatId('');
    setIsAddStudentOpen(true);
  };

  // Handle Submit New Student
  const handleSubmitAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Please enter the examinee full name.', 'error');
      return;
    }

    if (students.some((s) => s.rollNo === newRollNo)) {
      showToast(`Roll Number #${newRollNo} already exists in records. Please use a unique roll number.`, 'error');
      return;
    }

    let hallToAssign: string | undefined = undefined;
    let seatToAssign: string | undefined = undefined;

    if (placementMode === 'auto') {
      const best = findConflictFreeSeat(newBranch, newSubject);
      if (best) {
        hallToAssign = best.hall.id;
        seatToAssign = best.seat.id;
      }
    } else if (placementMode === 'manual') {
      if (!manualHallId || !manualSeatId) {
        showToast('Please select a hall and available desk.', 'error');
        return;
      }
      hallToAssign = manualHallId;
      seatToAssign = manualSeatId;
    }

    const newStudent: Student = {
      rollNo: newRollNo,
      name: newName.trim(),
      branch: newBranch,
      subject: newSubject.trim() || DEPT_SUBJECTS[newBranch],
      semester: 4,
      assignedHallId: hallToAssign,
      assignedSeatId: seatToAssign,
    };

    if (onAddStudent) {
      onAddStudent(newStudent);
      setIsAddStudentOpen(false);
      showToast(
        seatToAssign 
          ? `Admitted Roll #${newStudent.rollNo} (${newStudent.name}) and seated in ${hallToAssign} Desk ${seatToAssign}.`
          : `Admitted Roll #${newStudent.rollNo} (${newStudent.name}) to Waiting Pool.`,
        'success'
      );
    }
  };

  // Handle Confirm Remove Student
  const handleConfirmDelete = () => {
    if (!studentToDelete) return;
    const { rollNo, name, assignedHallId, assignedSeatId } = studentToDelete;
    if (onDeleteStudent) {
      onDeleteStudent(rollNo);
      setStudentToDelete(null);
      showToast(
        `Examinee #${rollNo} (${name}) removed from exam session. ${assignedSeatId ? `Desk ${assignedSeatId} in ${assignedHallId} vacated.` : ''}`,
        'info'
      );
    }
  };

  // Handle Open Move Seat Modal
  const handleOpenMoveSeat = (student: Student) => {
    setStudentToMove(student);
    const initialHall = student.assignedHallId || halls[0]?.id || '';
    setTargetHallId(initialHall);
    setTargetSeatId('');
  };

  // Handle Submit Move Seat
  const handleSubmitMoveSeat = () => {
    if (!studentToMove || !targetHallId || !targetSeatId) {
      showToast('Please choose an available desk.', 'error');
      return;
    }

    if (onAssignStudentToSeat) {
      onAssignStudentToSeat(targetHallId, targetSeatId, studentToMove.rollNo);
      showToast(`Roll #${studentToMove.rollNo} reassigned to ${targetHallId} Desk ${targetSeatId}.`, 'success');
      setStudentToMove(null);
    }
  };

  // Export Attendance CSV
  const handleExportCSV = () => {
    const headers = ['Roll No', 'Name', 'Department', 'Subject', 'Assigned Hall', 'Desk ID', 'Status'];
    const rows = students.map((s) => [
      s.rollNo,
      `"${s.name.replace(/"/g, '""')}"`,
      s.branch,
      `"${s.subject.replace(/"/g, '""')}"`,
      s.assignedHallId || 'Unassigned',
      s.assignedSeatId || 'None',
      s.assignedSeatId ? 'Seated' : 'Waiting',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Exam_Seating_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded Exam Seating Roster CSV.', 'success');
  };

  // Department modal filtered students
  const deptStudents = selectedDeptModal ? students.filter((s) => s.branch === selectedDeptModal) : [];

  return (
    <div className="space-y-6">
      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md border animate-in fade-in slide-in-from-bottom-3 duration-200 bg-slate-900/95 text-white border-slate-700">
          {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hero Welcome & Live Session Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE EXAM SESSION ACTIVE
              </span>
              <span className="text-xs text-slate-300 font-mono">Session: Midterm 2026–27 (Morning 10:00 AM)</span>
            </div>

            {/* Quick Actions Right */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm cursor-pointer"
                title="Admit a walk-in or late-arriving student into exam and auto-seat them"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Student for Exam</span>
              </button>

              <button
                onClick={handleAutoSeatAllWaiting}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm cursor-pointer"
                title="Automatically seat all unseated examinees without peer collisions"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Auto-Seat Waiting ({unassignedStudents.length})</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all cursor-pointer"
                title="Download CSV roster of all examinees and their desk assignments"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Roster CSV</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Exam Seating Arrangement &amp; Control Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl mt-1">
              Centralized exam control room: view real-time desk allocations across all halls, admit late candidates with conflict-free auto-seating, remove absentees, manage desk transfers, and audit anti-malpractice separation.
            </p>
          </div>

          {/* Quick Nav Badges */}
          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                onGenerateSeating();
                setActiveTab('seating');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Regenerate Fresh Plan</span>
            </button>

            <button
              onClick={() => {
                onRunAudit();
                setActiveTab('conflicts');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Audit Anti-Cheating Clashes ({conflicts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('campus')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-indigo-300" />
              <span>Campus Routes &amp; Invigilator Paths</span>
            </button>

            <button
              onClick={() => setActiveTab('presentation')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-lg cursor-pointer transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Teacher Presentation Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Interactive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Registered Examinees */}
        <button
          onClick={() => setActiveKpiModal('examinees')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer group"
          title="Click to view full examinees breakdown and statistics"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Examinees</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {students.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{assignedStudents.length} seated • {unassignedStudents.length} waiting</span>
            <span className="text-indigo-600 font-bold flex items-center gap-0.5 text-[11px]">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* KPI 2: Total Usable Desks */}
        <button
          onClick={() => setActiveKpiModal('desks')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all text-left cursor-pointer group"
          title="Click to view hall-by-hall desk capacities and aisles"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usable Desks</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {totalUsableSeats}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{halls.length} examination halls active</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5 text-[11px]">
              Details <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* KPI 3: Seated Candidates & Utilization */}
        <button
          onClick={() => setActiveKpiModal('seated')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer group"
          title="Click to view occupancy breakdown across halls"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hall Occupancy Rate</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono flex items-baseline gap-2">
            <span>{fillRate}%</span>
            <span className="text-xs text-slate-500 font-normal">({assignedStudents.length} / {totalUsableSeats})</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min(fillRate, 100)}%` }} />
          </div>
        </button>

        {/* KPI 4: Cheating Conflicts */}
        <button
          onClick={() => setActiveKpiModal('conflicts')}
          className={`border rounded-xl p-5 shadow-xs transition-all text-left cursor-pointer group ${
            conflicts.length === 0
              ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400'
              : 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
          }`}
          title="Click to inspect conflict audit details"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Anti-Cheating Audit</span>
            <div className={`p-2 rounded-lg ${conflicts.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {conflicts.length === 0 ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-2xl font-extrabold mt-2 font-mono flex items-center gap-2">
            <span className={conflicts.length === 0 ? 'text-emerald-900' : 'text-amber-900'}>
              {conflicts.length}
            </span>
            <span className="text-xs font-normal text-slate-600">clashes detected</span>
          </div>
          <div className="text-xs mt-1 font-medium flex items-center justify-between">
            {conflicts.length === 0 ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 100% Conflict-Free
              </span>
            ) : (
              <span className="text-amber-800 font-semibold">
                {conflicts.length} neighbor pair(s) review
              </span>
            )}
            <span className="text-slate-600 font-bold flex items-center gap-0.5 text-[11px]">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      {/* CORE FEATURE: Live Exam Seating Arrangement & Candidate Management Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Live Exam Seating Arrangement &amp; Examinee Manager
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time examinee roster during exams: admit late candidates, auto-seat into safe conflict-free desks, remove absentees, or transfer seats on the fly.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Add examinee during exam"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Student for Exam</span>
            </button>

            {unassignedStudents.length > 0 && (
              <button
                onClick={handleAutoSeatAllWaiting}
                className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-300 hover:bg-amber-400 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Auto-seat all waiting examinees"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-950" />
                <span>Auto-Seat ({unassignedStudents.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search candidate by roll no, name, dept, subject, hall, or desk..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter Segmented Control */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('seated');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'seated' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Seated ({assignedStudents.length})
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('unseated');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'unseated' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Waiting ({unassignedStudents.length})
                </button>
              </div>

              {/* Department Dropdown */}
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="AIDS">AIDS</option>
              </select>

              {/* Hall Dropdown */}
              <select
                value={hallFilter}
                onChange={(e) => {
                  setHallFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Halls</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.seats.filter((s) => s.status === 'occupied').length} seated)
                  </option>
                ))}
                <option value="unassigned">Unassigned / Waiting</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Examinees Seating Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Examinee Name</th>
                <th className="py-3 px-4">Department &amp; Subject</th>
                <th className="py-3 px-4">Assigned Venue &amp; Desk</th>
                <th className="py-3 px-4">Exam Status</th>
                <th className="py-3 px-4 text-right">Actions During Exam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No examinees found matching your current filters.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setDeptFilter('all');
                        setHallFilter('all');
                      }}
                      className="mt-2 text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st) => {
                  const isSeated = Boolean(st.assignedSeatId && st.assignedHallId);
                  const isConflicted = conflictRollSet.has(st.rollNo);
                  const hallObj = halls.find((h) => h.id === st.assignedHallId);

                  const deptColors: Record<string, string> = {
                    CSE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    ECE: 'bg-purple-50 text-purple-700 border-purple-200',
                    MECH: 'bg-amber-50 text-amber-700 border-amber-200',
                    AIDS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  };
                  const badgeColor = deptColors[st.branch] || 'bg-slate-100 text-slate-800 border-slate-200';

                  return (
                    <tr key={st.rollNo} className="hover:bg-slate-50/70 transition-colors">
                      {/* Roll Number */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900">#{st.rollNo}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${badgeColor}`}>
                            {st.branch}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{st.name}</span>
                      </td>

                      {/* Department & Subject */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 font-medium block">{st.subject}</span>
                          <span className="text-[11px] text-slate-400 font-mono">Dept of {st.branch}</span>
                        </div>
                      </td>

                      {/* Seating Venue & Desk */}
                      <td className="py-3 px-4">
                        {isSeated ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg border border-slate-200 font-mono font-bold text-xs flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              {hallObj?.name || st.assignedHallId}
                            </span>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 font-mono font-extrabold text-xs">
                              Desk {st.assignedSeatId}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px]">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Waiting Pool / Not Seated
                          </span>
                        )}
                      </td>

                      {/* Exam Status Badge */}
                      <td className="py-3 px-4">
                        {isConflicted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            Neighbor Clash
                          </span>
                        ) : isSeated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Seated &amp; Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Late / Unseated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* If Unseated: Auto-Seat button */}
                          {!isSeated && (
                            <button
                              onClick={() => handleAutoSeatSingle(st)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Auto-place this student into the best conflict-free desk"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Auto-Seat</span>
                            </button>
                          )}

                          {/* Choose Seat or Move Desk button */}
                          <button
                            onClick={() => handleOpenMoveSeat(st)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer border border-slate-200"
                            title={isSeated ? 'Move to another desk or swap' : 'Pick specific hall and seat'}
                          >
                            <Move className="w-3 h-3 text-slate-600" />
                            <span>{isSeated ? 'Move Desk' : 'Assign Desk'}</span>
                          </button>

                          {/* If Seated: Unseat button */}
                          {isSeated && (
                            <button
                              onClick={() => handleUnseatExaminee(st)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-semibold text-[11px] cursor-pointer border border-amber-200"
                              title="Vacate desk and send examinee to waiting pool"
                            >
                              Unseat
                            </button>
                          )}

                          {/* Remove Student from Exam button */}
                          <button
                            onClick={() => setStudentToDelete(st)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer border border-rose-200"
                            title="Remove student from exam session and vacate desk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{paginatedStudents.length}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredStudents.length}</span> examinees
            {filteredStudents.length < students.length && (
              <span className="text-slate-400 ml-1"> (filtered from {students.length} total)</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Hall Seating Matrices Overview & Visualizer Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Examination Hall Seating Matrices &amp; Capacities
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Live desk grid matrix for each active exam venue. Click any hall to inspect individual desks or generate door attendance charts.
            </span>
          </div>

          <button
            onClick={() => setActiveTab('seating')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Full Seating Visualizer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {halls.map((hall) => {
            const totalSlots = hall.rows * hall.cols;
            const aisles = hall.seats.filter((s) => s.status === 'aisle').length;
            const blocked = hall.seats.filter((s) => s.status === 'blocked').length;
            const usable = totalSlots - aisles - blocked;
            const seatedInHall = hall.seats.filter((s) => s.status === 'occupied').length;
            const hallFill = usable > 0 ? Math.round((seatedInHall / usable) * 100) : 0;

            // Department count in this hall
            const hallDeptCount = hall.seats.reduce((acc, s) => {
              if (s.status === 'occupied' && s.studentRoll) {
                const st = studentMap.get(s.studentRoll);
                if (st) {
                  acc[st.branch] = (acc[st.branch] || 0) + 1;
                }
              }
              return acc;
            }, {} as Record<string, number>);

            return (
              <div
                key={hall.id}
                className="border border-slate-200 hover:border-indigo-300 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50/90 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">{hall.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {hall.block} • Floor {hall.floor}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                      {seatedInHall} / {usable} seated
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
                      <span>Occupancy</span>
                      <span className="font-mono font-bold text-slate-800">{hallFill}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          hallFill > 90 ? 'bg-indigo-700' : hallFill > 50 ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(hallFill, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini Desk Matrix Visualization */}
                  <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Mini Desk Layout ({hall.rows}x{hall.cols})</span>
                      <span className="text-emerald-700 font-bold">{usable - seatedInHall} free</span>
                    </div>
                    <div
                      className="grid gap-1 place-items-center"
                      style={{
                        gridTemplateColumns: `repeat(${hall.cols}, minmax(0, 1fr))`,
                      }}
                    >
                      {hall.seats.map((seat) => {
                        const occupant = seat.studentRoll ? studentMap.get(seat.studentRoll) : null;
                        let dotColor = 'bg-slate-200 text-transparent'; // free
                        if (seat.status === 'aisle') dotColor = 'bg-slate-100 text-transparent opacity-30';
                        else if (seat.status === 'blocked') dotColor = 'bg-rose-200 text-transparent';
                        else if (seat.status === 'occupied') {
                          if (occupant?.branch === 'CSE') dotColor = 'bg-indigo-600';
                          else if (occupant?.branch === 'ECE') dotColor = 'bg-purple-600';
                          else if (occupant?.branch === 'MECH') dotColor = 'bg-amber-600';
                          else if (occupant?.branch === 'AIDS') dotColor = 'bg-emerald-600';
                          else dotColor = 'bg-slate-800';
                        }

                        return (
                          <div
                            key={seat.id}
                            className={`w-3.5 h-3.5 rounded-xs ${dotColor} flex items-center justify-center text-[7px] font-mono text-white transition-transform hover:scale-125 cursor-pointer`}
                            title={
                              seat.status === 'occupied' && occupant
                                ? `${seat.id}: Roll #${occupant.rollNo} (${occupant.name}, ${occupant.branch})`
                                : `${seat.id}: ${seat.status}`
                            }
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Department distribution chips */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    {Object.entries(hallDeptCount).map(([d, cnt]) => (
                      <span key={d} className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                        {d}: {cnt}
                      </span>
                    ))}
                    {Object.keys(hallDeptCount).length === 0 && (
                      <span className="text-[11px] text-slate-400 italic">No candidates seated yet</span>
                    )}
                  </div>
                </div>

                {/* Hall Action Buttons */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDoorSheetHall(hall)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title="Print invigilator door chart"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Door Sheet</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectHall(hall.id);
                      setActiveTab('seating');
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    title="Inspect and configure layout grid"
                  >
                    <span>Inspect Desks</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automatic Branch Intake & Hall Placement Section */}
      <BranchAllocationSection
        halls={halls}
        students={students}
        onApplyPlan={onApplyPlan}
        onSelectHall={onSelectHall}
        setActiveTab={setActiveTab}
        onRecordTrace={onRecordTrace}
      />

      {/* Department Breakdown with Clickable Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Candidates by Academic Department
            </h3>
            <span className="text-xs text-slate-500">
              Click any department card to view examinee directory &amp; desk allocations
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            4 Departments
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(branchCounts).map(([branch, count]) => {
            const assigned = students.filter((s) => s.branch === branch && s.assignedSeatId).length;
            const colors: Record<string, { bg: string; text: string; bar: string; hover: string }> = {
              CSE: { bg: 'bg-indigo-50/70 border-indigo-200', text: 'text-indigo-900', bar: 'bg-indigo-600', hover: 'hover:border-indigo-400 hover:bg-indigo-50' },
              ECE: { bg: 'bg-purple-50/70 border-purple-200', text: 'text-purple-900', bar: 'bg-purple-600', hover: 'hover:border-purple-400 hover:bg-purple-50' },
              MECH: { bg: 'bg-amber-50/70 border-amber-200', text: 'text-amber-900', bar: 'bg-amber-600', hover: 'hover:border-amber-400 hover:bg-amber-50' },
              AIDS: { bg: 'bg-emerald-50/70 border-emerald-200', text: 'text-emerald-900', bar: 'bg-emerald-600', hover: 'hover:border-emerald-400 hover:bg-emerald-50' },
            };
            const c = colors[branch] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-900', bar: 'bg-slate-800', hover: 'hover:border-slate-400' };

            return (
              <button
                key={branch}
                onClick={() => setSelectedDeptModal(branch)}
                className={`border rounded-xl p-3.5 ${c.bg} ${c.hover} transition-all text-left cursor-pointer group shadow-2xs`}
                title={`Click to view all ${branch} examinees and their desk assignments`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-extrabold text-sm font-mono ${c.text}`}>{branch}</span>
                  <span className="text-xs bg-white/90 px-2 py-0.5 rounded-md border border-black/10 font-bold font-mono">
                    {count} cand.
                  </span>
                </div>
                <div className="mt-2 text-xs">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                    <span>Allocated</span>
                    <span className="font-mono font-bold">{assigned}/{count}</span>
                  </div>
                  <div className="w-full bg-white/70 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${c.bar}`}
                      style={{ width: `${Math.round((assigned / count) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] font-bold text-slate-600 group-hover:text-slate-900">
                  <span>Examinees</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Section: SDG 4 & DSA Technical Architecture Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: UN SDG 4 Quality Education Card */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-slate-50 border border-emerald-200 rounded-xl p-5 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>UN SDG 4: Quality Education</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Examination integrity directly impacts educational quality. By automating desk arrangements with zero peer clustering, students take fair exams without accidental cheating proximity.
          </p>
          <div className="space-y-1.5 text-xs text-slate-700 pt-1">
            <div className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>Anti-Malpractice Isolation:</strong> Different branches sit side-by-side to prevent exam paper copying.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>Dynamic Examination Control:</strong> Staff can admit late arrivals or relocate examinees in real time.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>Invigilator Shortest Path:</strong> Staff reach examinee desks via Dijkstra shortest route planning.</span>
            </div>
          </div>
        </div>

        {/* Right: DSA Architecture Box with Clickable Links */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Data Structures Architecture</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Units 1–5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setActiveTab('students')}
              className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group"
              title="Inspect the AVL tree student lookup visualizer"
            >
              <div className="font-bold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                <span>AVL Balanced Tree</span>
                <span className="font-mono text-indigo-700 text-[11px] font-bold">O(log N)</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Roll number indexing with LL, RR, LR, RL balancing rotations.
              </div>
            </button>

            <button
              onClick={() => setActiveTab('conflicts')}
              className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group"
              title="Inspect the planar seat graph and BFS/DFS walk"
            >
              <div className="font-bold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                <span>Planar Seat Graph</span>
                <span className="font-mono text-indigo-700 text-[11px] font-bold">O(V + E)</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Desks are vertices, orthogonal edges detect cheating proximity.
              </div>
            </button>

            <button
              onClick={() => setActiveTab('campus')}
              className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group"
              title="Inspect Dijkstra shortest walking route algorithm"
            >
              <div className="font-bold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                <span>Dijkstra Shortest Path</span>
                <span className="font-mono text-indigo-700 text-[11px] font-bold">O((V+E) log V)</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Fastest walking route from Control Room to any exam hall door.
              </div>
            </button>

            <button
              onClick={() => setActiveTab('campus')}
              className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group"
              title="Inspect 0/1 Knapsack dynamic programming"
            >
              <div className="font-bold text-slate-900 group-hover:text-indigo-900 flex items-center justify-between">
                <span>0/1 Knapsack DP</span>
                <span className="font-mono text-indigo-700 text-[11px] font-bold">O(N · W)</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Optimal hall selection to maximize desks under operational budget.
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Add Student for Exam (Late Entry / Emergency Walk-In) */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add Student for Exam (Late Entry / Walk-In)</h3>
                  <span className="text-xs text-slate-500">Admit a candidate and assign seating during the active exam</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddStudent} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Roll Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newRollNo}
                    onChange={(e) => setNewRollNo(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Branch / Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newBranch}
                    onChange={(e) => {
                      const b = e.target.value as 'CSE' | 'ECE' | 'MECH' | 'AIDS';
                      setNewBranch(b);
                      setNewSubject(DEPT_SUBJECTS[b]);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="CSE">CSE (Computer Science)</option>
                    <option value="ECE">ECE (Electronics)</option>
                    <option value="MECH">MECH (Mechanical)</option>
                    <option value="AIDS">AIDS (Artificial Intelligence)</option>
                  </select>
                </div>
              </div>

              {/* Examinee Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Examinee Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Pooja Rao or Rohan Verma"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Exam Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exam Paper / Subject
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Placement Strategy Option */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-800">
                  Desk Allocation Strategy:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-all ${
                    placementMode === 'auto' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="placement"
                      checked={placementMode === 'auto'}
                      onChange={() => setPlacementMode('auto')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Smart Auto-Seat (Conflict-Free Guarantee)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Algorithm scans all active halls to find a free desk with 0 collisions (no adjacent examinee from {newBranch}).
                      </p>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-all ${
                    placementMode === 'manual' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="placement"
                      checked={placementMode === 'manual'}
                      onChange={() => setPlacementMode('manual')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Choose Specific Hall &amp; Desk</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Pick a particular hall and desk manually.
                      </p>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-all ${
                    placementMode === 'waiting' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="placement"
                      checked={placementMode === 'waiting'}
                      onChange={() => setPlacementMode('waiting')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Add to Waiting Pool (Seat Later)</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Admit student to records without assigning a seat immediately.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Manual Selection Fields */}
              {placementMode === 'manual' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Hall</label>
                    <select
                      value={manualHallId}
                      onChange={(e) => {
                        setManualHallId(e.target.value);
                        setManualSeatId('');
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      {halls.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Available Desk</label>
                    <select
                      value={manualSeatId}
                      onChange={(e) => setManualSeatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    >
                      <option value="">-- Select Desk --</option>
                      {halls
                        .find((h) => h.id === manualHallId)
                        ?.seats.filter((s) => s.status === 'free')
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            Desk {s.id} (Row {s.row}, Col {s.col})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Admit &amp; Seat Examinee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Move / Change Seat for Examinee */}
      {studentToMove && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Reassign / Move Examinee Desk</h3>
                  <span className="text-xs text-slate-500">
                    Roll #{studentToMove.rollNo} • {studentToMove.name} ({studentToMove.branch})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStudentToMove(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] text-slate-500">Current Assignment:</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {studentToMove.assignedSeatId && studentToMove.assignedHallId ? (
                    <span>
                      {studentToMove.assignedHallId} • Desk {studentToMove.assignedSeatId}
                    </span>
                  ) : (
                    <span className="text-amber-700 italic">Currently Unseated in Waiting Pool</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Examination Hall</label>
                <select
                  value={targetHallId}
                  onChange={(e) => {
                    setTargetHallId(e.target.value);
                    setTargetSeatId('');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {halls.map((h) => {
                    const freeCount = h.seats.filter((s) => s.status === 'free').length;
                    return (
                      <option key={h.id} value={h.id}>
                        {h.name} ({freeCount} free desks)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Free Desk</label>
                <select
                  value={targetSeatId}
                  onChange={(e) => setTargetSeatId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                >
                  <option value="">-- Choose Desk --</option>
                  {halls
                    .find((h) => h.id === targetHallId)
                    ?.seats.filter((s) => s.status === 'free')
                    .map((s) => {
                      const hall = halls.find((h) => h.id === targetHallId)!;
                      const { isConflictFree } = checkSeatClashes(hall, s, studentToMove.branch, studentToMove.subject);
                      return (
                        <option key={s.id} value={s.id}>
                          Desk {s.id} (Row {s.row}, Col {s.col}) {isConflictFree ? '— [Safe: 0 Conflict]' : '— [Caution: Clash Risk]'}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Safety Preview */}
              {targetSeatId && (
                (() => {
                  const hall = halls.find((h) => h.id === targetHallId);
                  const seat = hall?.seats.find((s) => s.id === targetSeatId);
                  if (!hall || !seat) return null;
                  const { isConflictFree, reasons } = checkSeatClashes(hall, seat, studentToMove.branch, studentToMove.subject);

                  return (
                    <div className={`p-3 rounded-xl border text-xs ${
                      isConflictFree ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        {isConflictFree ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        <span>{isConflictFree ? 'Conflict-Free Placement' : 'Caution: Neighbor Collision'}</span>
                      </div>
                      <p className="text-[11px] mt-0.5">
                        {isConflictFree
                          ? `No adjacent students from ${studentToMove.branch} or taking ${studentToMove.subject}.`
                          : reasons.join('; ')}
                      </p>
                    </div>
                  );
                })()
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentToMove(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitMoveSeat}
                  disabled={!targetSeatId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm New Desk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete Examinee */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-rose-950 text-base">Remove Examinee from Exam?</h3>
              </div>
              <button
                onClick={() => setStudentToDelete(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Are you sure you want to remove <strong>Roll #{studentToDelete.rollNo} ({studentToDelete.name})</strong> from the exam session?
              </p>

              {studentToDelete.assignedSeatId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800">
                  <span>Currently seated at: </span>
                  <strong>{studentToDelete.assignedHallId} • Desk {studentToDelete.assignedSeatId}</strong>
                  <div className="text-[11px] text-emerald-700 mt-1 font-sans">
                    ✓ This desk will be immediately freed up for other candidates.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Removal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Examinees Breakdown Modal (Clicked from KPI 1) */}
      {activeKpiModal === 'examinees' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Registered Examinees Breakdown</h3>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="text-slate-500 text-[11px] font-medium">Total Registered</div>
                  <div className="text-2xl font-extrabold text-indigo-950 font-mono mt-0.5">{students.length}</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-slate-500 text-[11px] font-medium">Seated</div>
                  <div className="text-2xl font-extrabold text-emerald-950 font-mono mt-0.5">{assignedStudents.length}</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-slate-500 text-[11px] font-medium">Waiting / Unseated</div>
                  <div className="text-2xl font-extrabold text-amber-950 font-mono mt-0.5">{unassignedStudents.length}</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-slate-500 text-[11px] font-medium">Departments</div>
                  <div className="text-2xl font-extrabold text-purple-950 font-mono mt-0.5">4</div>
                </div>
              </div>

              {/* Department Table */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Examinees by Department</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Department</th>
                        <th className="py-2.5 px-4">Total Students</th>
                        <th className="py-2.5 px-4">Seated</th>
                        <th className="py-2.5 px-4">Unseated</th>
                        <th className="py-2.5 px-4 text-right">Placement Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {Object.entries(branchCounts).map(([branch, count]) => {
                        const seated = students.filter((s) => s.branch === branch && s.assignedSeatId).length;
                        const unseated = count - seated;
                        const pct = count > 0 ? Math.round((seated / count) * 100) : 0;
                        return (
                          <tr key={branch} className="hover:bg-slate-50">
                            <td className="py-2 px-4 font-bold text-slate-900 font-sans">{branch}</td>
                            <td className="py-2 px-4">{count}</td>
                            <td className="py-2 px-4 text-emerald-700 font-bold">{seated}</td>
                            <td className="py-2 px-4 text-amber-700">{unseated}</td>
                            <td className="py-2 px-4 text-right font-bold">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveKpiModal(null);
                    setActiveTab('students');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Student Directory &amp; AVL Search</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Halls & Desk Capacities Modal (Clicked from KPI 2) */}
      {activeKpiModal === 'desks' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Hall Capacity &amp; Desk Breakdown</h3>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Hall Name</th>
                      <th className="py-2.5 px-3">Block / Floor</th>
                      <th className="py-2.5 px-3">Grid</th>
                      <th className="py-2.5 px-3">Aisles</th>
                      <th className="py-2.5 px-3">Broken</th>
                      <th className="py-2.5 px-3">Usable Desks</th>
                      <th className="py-2.5 px-3">Occupied</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {halls.map((hall) => {
                      const totalSlots = hall.rows * hall.cols;
                      const aisles = hall.seats.filter((s) => s.status === 'aisle').length;
                      const blocked = hall.seats.filter((s) => s.status === 'blocked').length;
                      const usable = totalSlots - aisles - blocked;
                      const seated = hall.seats.filter((s) => s.status === 'occupied').length;

                      return (
                        <tr key={hall.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900 font-sans">{hall.name}</td>
                          <td className="py-2 px-3 font-sans text-slate-600">{hall.block}, Fl {hall.floor}</td>
                          <td className="py-2 px-3">{hall.rows}x{hall.cols}</td>
                          <td className="py-2 px-3 text-slate-500">{aisles}</td>
                          <td className="py-2 px-3 text-amber-700">{blocked}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">{usable}</td>
                          <td className="py-2 px-3 text-indigo-700 font-bold">{seated}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => {
                                onSelectHall(hall.id);
                                setActiveKpiModal(null);
                                setActiveTab('seating');
                              }}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 font-medium">
                Total Campus Capacity: <strong>{totalUsableSeats} usable desks</strong> across {halls.length} examination halls. Aisles and damaged desks are mathematically eliminated from candidate assignment.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Seated Candidates Modal (Clicked from KPI 3) */}
      {activeKpiModal === 'seated' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Seat Allocation Status</h3>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div>
                  <span className="text-indigo-900 font-bold text-sm block">
                    {assignedStudents.length} of {students.length} Candidates Assigned
                  </span>
                  <span className="text-indigo-700 text-xs">
                    {unassignedStudents.length > 0 
                      ? `${unassignedStudents.length} examinees remaining in waiting pool.`
                      : 'All examinees are seated!'}
                  </span>
                </div>
                <div className="text-2xl font-extrabold font-mono text-indigo-900">{fillRate}%</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Hall-by-Hall Distribution:</h4>
                <div className="space-y-2">
                  {halls.map((hall) => {
                    const seated = hall.seats.filter((s) => s.status === 'occupied').length;
                    const usable = hall.seats.filter((s) => s.status !== 'aisle' && s.status !== 'blocked').length;
                    const pct = usable > 0 ? Math.round((seated / usable) * 100) : 0;

                    return (
                      <div key={hall.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 font-sans block">{hall.name}</span>
                          <span className="text-slate-500 text-[11px] font-mono">{hall.block} • Floor {hall.floor}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-800 text-xs block">{seated} / {usable} desks</span>
                          <span className="text-[11px] text-slate-500 font-mono">{pct}% full</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveKpiModal(null);
                    setActiveTab('seating');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Seating Layout Grid</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cheating Collisions Modal (Clicked from KPI 4) */}
      {activeKpiModal === 'conflicts' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Cheating Conflict Audit Details</h3>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {conflicts.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="font-bold text-sm">100% Conflict-Free Seating Verified!</div>
                  <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                    Zero adjacent students share the same academic department or subject. All orthogonal desk pairs satisfy the anti-malpractice constraint.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium">
                    Found {conflicts.length} neighbor clash(es). Neighboring students belong to the same department or subject.
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {conflicts.map((c, i) => (
                      <div key={i} className="p-3 bg-white flex items-center justify-between gap-3 font-mono text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{c.seatId1}</span> (Roll #{c.student1.rollNo}, {c.student1.branch})
                          <span className="text-slate-400 mx-1.5">↔</span>
                          <span className="font-bold text-slate-900">{c.seatId2}</span> (Roll #{c.student2.rollNo}, {c.student2.branch})
                        </div>
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] rounded font-bold font-sans">
                          {c.relation === 'horizontal' ? 'Side-by-side' : 'Front-to-back'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveKpiModal(null);
                    onRunAudit();
                    setActiveTab('conflicts');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Full Audit &amp; Patrolling Tab</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Department Examinees Modal */}
      {selectedDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 font-mono">
                  {selectedDeptModal}
                </span>
                <h3 className="font-bold text-slate-900 text-base">Department Examinee Directory</h3>
                <span className="text-xs text-slate-500 font-mono">({deptStudents.length} candidates)</span>
              </div>
              <button
                onClick={() => setSelectedDeptModal(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Assigned Hall</th>
                      <th className="py-2.5 px-3">Desk #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {deptStudents.map((s) => (
                      <tr key={s.rollNo} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{s.rollNo}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">{s.name}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{s.subject}</td>
                        <td className="py-2 px-3">
                          {s.assignedHallId ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                              {s.assignedHallId}
                            </span>
                          ) : (
                            <span className="text-amber-700 italic font-sans">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-indigo-700">
                          {s.assignedSeatId || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-medium">
                  {deptStudents.filter((s) => s.assignedSeatId).length} of {deptStudents.length} candidates placed.
                </span>
                <button
                  onClick={() => {
                    setSelectedDeptModal(null);
                    setActiveTab('seating');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Highlight on Seating Grid</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Hall Door Attendance Sheet Modal */}
      {doorSheetHall && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Examination Hall Door Attendance Chart</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {doorSheetHall.name} ({doorSheetHall.block}, Floor {doorSheetHall.floor})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Door Sheet</span>
                </button>
                <button
                  onClick={() => setDoorSheetHall(null)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Header inside door sheet */}
              <div className="border-b border-slate-300 pb-4 text-center space-y-1">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Autonomous College Examination Cell</div>
                <div className="text-lg font-extrabold text-slate-900">Official Candidate Door Seating Chart</div>
                <div className="text-xs font-mono text-slate-600">
                  Venue: {doorSheetHall.name} | Block: {doorSheetHall.block} | Floor: {doorSheetHall.floor}
                </div>
              </div>

              {/* Seating Table */}
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
                    {doorSheetHall.seats
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
                <span>Total Seated in Hall: {doorSheetHall.seats.filter((s) => s.status === 'occupied').length} examinees</span>
                <span>Exam Cell Controller Signature: _______________</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

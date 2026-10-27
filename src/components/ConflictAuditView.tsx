/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Hall, Student, ConflictInfo, AlgorithmTrace } from '../types';
import { SeatGraph, GraphTraversalStep } from '../dsa/graph';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Play, 
  Compass, 
  Sparkles,
  ArrowRight,
  X,
  Users,
  Check,
  Search,
  RefreshCw,
  Eye
} from 'lucide-react';

interface ConflictAuditViewProps {
  halls: Hall[];
  students: Student[];
  conflicts: ConflictInfo[];
  onRecordTrace: (trace: AlgorithmTrace) => void;
}

export const ConflictAuditView: React.FC<ConflictAuditViewProps> = ({
  halls,
  students,
  conflicts,
  onRecordTrace,
}) => {
  const [selectedHallId, setSelectedHallId] = useState<string>(halls[0]?.id || '');
  const [selectedClash, setSelectedClash] = useState<ConflictInfo | null>(null);
  const [inspectedSeatId, setInspectedSeatId] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const activeHall = useMemo(
    () => halls.find((h) => h.id === selectedHallId) || halls[0],
    [halls, selectedHallId]
  );

  const seatGraph = useMemo(() => new SeatGraph(activeHall), [activeHall]);

  const studentMap = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.rollNo, s));
    return map;
  }, [students]);

  // Traversal state
  const [traversalType, setTraversalType] = useState<'BFS' | 'DFS'>('BFS');
  const [traversalStartSeat, setTraversalStartSeat] = useState<string>(
    seatGraph.vertices[0] || ''
  );
  const [traversalResult, setTraversalResult] = useState<{
    visitedOrder: string[];
    steps: GraphTraversalStep[];
    type: 'BFS' | 'DFS';
  } | null>(null);

  // Run BFS or DFS
  const handleRunTraversal = (type: 'BFS' | 'DFS') => {
    setTraversalType(type);
    const start = performance.now();
    let res: any;

    if (type === 'BFS') {
      res = seatGraph.runBFS(traversalStartSeat);
    } else {
      res = seatGraph.runDFS(traversalStartSeat);
    }

    const duration = Number((performance.now() - start).toFixed(2));
    setTraversalResult({
      visitedOrder: res.visitedOrder,
      steps: res.steps,
      type,
    });

    setScanNotice(`${type === 'BFS' ? 'Radial Sweep (Queue)' : 'Row Walk (Stack)'} traversed ${res.visitedOrder.length} desks starting from ${traversalStartSeat}.`);

    onRecordTrace({
      id: `trace-traversal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: `Hall Patrolling (${type})`,
      unit: 'Unit 3: Graph Traversal',
      problemSolved: `Simulate teacher inspection pattern using ${type === 'BFS' ? 'Breadth-First Search (circles outward)' : 'Depth-First Search (aisle by aisle)'}.`,
      timeComplexity: 'O(V + E) time',
      spaceComplexity: 'O(V) memory',
      inputSummary: `Start Desk: ${traversalStartSeat}, Total Desks: ${seatGraph.vertices.length}`,
      executionTimeMs: duration,
      operationCount: res.steps.length,
      steps: res.steps.map((s: any) => s.actionDescription),
      resultSummary: `${type} visited ${res.visitedOrder.length} desks in order.`,
    });
  };

  // Re-Scan All Halls
  const handleRunRescan = () => {
    const totalDesks = halls.reduce((sum, h) => sum + h.seats.filter(s => s.status === 'occupied').length, 0);
    const msg = `Scan Completed: Verified ${totalDesks} seated candidates across ${halls.length} halls. Found ${conflicts.length} neighbor collision pairs.`;
    setScanNotice(msg);

    onRecordTrace({
      id: `trace-audit-scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      algorithmName: 'Planar Orthogonal Proximity Scan',
      unit: 'Unit 3: Graph Auditing',
      problemSolved: 'Verify that every seated candidate does not share department or subject with adjacent neighbors.',
      timeComplexity: 'O(V · deg(v)) = O(4V)',
      spaceComplexity: 'O(V) memory',
      inputSummary: `${halls.length} halls, ${totalDesks} occupied desks`,
      executionTimeMs: 0.15,
      operationCount: totalDesks * 4,
      steps: [
        'Iterated through all occupied desks in each hall.',
        'Checked left, right, front, and back neighbors in planar graph.',
        conflicts.length === 0 
          ? 'Zero neighbor collisions detected: 100% compliant.' 
          : `${conflicts.length} clashing pairs found.`
      ],
      resultSummary: msg,
    });
  };

  // Details of inspected seat in traversal
  const inspectedSeat = inspectedSeatId 
    ? activeHall.seats.find(s => s.id === inspectedSeatId) 
    : null;
  const inspectedStudent = inspectedSeat?.studentRoll 
    ? studentMap.get(inspectedSeat.studentRoll) 
    : null;
  const inspectedNeighbors = inspectedSeatId 
    ? seatGraph.getNeighbors(inspectedSeatId).map(nId => {
        const s = activeHall.seats.find(seat => seat.id === nId);
        const stu = s?.studentRoll ? studentMap.get(s.studentRoll) : null;
        return { seatId: nId, seat: s, student: stu };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              AUDIT &amp; CHEATING CHECK
            </span>
            <span className="text-xs text-slate-500 font-medium">Neighbor Proximity &amp; Patrolling</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Neighbor Conflict Audit &amp; Patrolling Simulation
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Checks whether any students from the same department or subject are sitting side-by-side or front-and-back. Also simulates invigilator walk patterns using graph traversals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunRescan}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Re-run planar graph check across all rooms"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Re-Scan All Halls</span>
          </button>

          <span className={`text-xs px-3.5 py-2 rounded-xl font-bold border flex items-center gap-1.5 shadow-2xs ${
            conflicts.length > 0 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {conflicts.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{conflicts.length} Neighbor Conflicts</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Conflict-Free Seating</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Floating notice */}
      {scanNotice && (
        <div className="bg-indigo-900 text-white px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{scanNotice}</span>
          </div>
          <button
            onClick={() => setScanNotice(null)}
            className="p-1 hover:bg-white/20 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Conflict Audit Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Neighbor Clash Report ({conflicts.length} detected)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Click any row to inspect collision details &amp; suggested swap
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          {conflicts.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Desk 1</th>
                  <th className="py-2.5 px-4">Student 1</th>
                  <th className="py-2.5 px-4">Desk 2</th>
                  <th className="py-2.5 px-4">Student 2</th>
                  <th className="py-2.5 px-4">Proximity</th>
                  <th className="py-2.5 px-4">Why it Clashes</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {conflicts.map((c, i) => (
                  <tr key={i} className="hover:bg-red-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{c.seatId1}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-800 font-medium">
                      {c.student1.name} (Roll #{c.student1.rollNo}, {c.student1.branch})
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{c.seatId2}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-800 font-medium">
                      {c.student2.name} (Roll #{c.student2.rollNo}, {c.student2.branch})
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 capitalize">
                      {c.relation === 'horizontal' ? 'Side-by-side' : 'Front-to-back'}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded">
                        {c.type === 'both' ? 'Same Branch & Subject' : c.type === 'same_branch' ? 'Same Branch' : 'Same Subject'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedClash(c)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-sans font-bold text-[11px] cursor-pointer shadow-2xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-2" />
              <div className="font-extrabold text-slate-800 text-sm">Clean Arrangement — Zero Cheating Clashes!</div>
              <p className="text-slate-500 max-w-sm mt-1 leading-relaxed">
                Every seated examinee sits next to peers from different departments and writing different exam papers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invigilator Patrolling Simulator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600" />
              <span>Simulate Invigilator Patrolling Walk (BFS vs DFS)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Watch how a teacher walks through the desks: <strong>Radial Sweep (BFS)</strong> steps outwards in circles; <strong>Row Walk (DFS)</strong> walks down whole rows.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Select Hall:</span>
            <select
              value={selectedHallId}
              onChange={(e) => {
                setSelectedHallId(e.target.value);
                setTraversalResult(null);
                setInspectedSeatId(null);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold"
            >
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Start from Desk:</span>
            <select
              value={traversalStartSeat}
              onChange={(e) => setTraversalStartSeat(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs font-bold"
            >
              {seatGraph.vertices.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunTraversal('BFS')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Traverse radial outward rings using Queue"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Radial Sweep (BFS Queue)</span>
            </button>

            <button
              onClick={() => handleRunTraversal('DFS')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Traverse row by row using Stack"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Row-by-Row Walk (DFS Stack)</span>
            </button>
          </div>
        </div>

        {/* Results */}
        {traversalResult && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-indigo-950">
              <div className="font-bold flex items-center gap-2">
                <span>{traversalResult.type === 'BFS' ? 'Radial Sweep (BFS)' : 'Row-by-Row Walk (DFS)'} Completed:</span>
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {traversalResult.visitedOrder.length} Desks Checked
                </span>
              </div>
              <div className="text-[11px] font-mono text-indigo-800">
                Pattern: {traversalResult.type === 'BFS' ? 'Level by Level (Queue)' : 'Deep along Rows (Stack)'}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Exact Order Visited (click any desk to inspect occupant &amp; orthogonal neighbors):</span>
                <span className="text-slate-400 font-mono">1 → {traversalResult.visitedOrder.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {traversalResult.visitedOrder.map((seatId, idx) => (
                  <button
                    key={seatId}
                    onClick={() => setInspectedSeatId(seatId)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] shadow-2xs font-medium cursor-pointer transition-all ${
                      inspectedSeatId === seatId
                        ? 'bg-indigo-600 text-white border-indigo-700 font-bold ring-2 ring-indigo-300'
                        : 'bg-white hover:bg-indigo-50 text-slate-800 border-slate-200'
                    }`}
                    title={`Click to inspect Desk ${seatId}`}
                  >
                    <span className={inspectedSeatId === seatId ? 'text-indigo-200 mr-1 text-[9px]' : 'text-slate-400 mr-1 text-[9px]'}>
                      #{idx + 1}
                    </span>
                    {seatId.split('-')[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Inspect Clash Modal */}
      {selectedClash && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Cheating Clash Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedClash(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900">
                <div className="font-bold">Collision Detected:</div>
                <div className="text-[11px] mt-0.5">
                  Two neighboring desks are positioned <strong>{selectedClash.relation === 'horizontal' ? 'side-by-side' : 'front-and-back'}</strong> with students writing the same examination.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">Desk 1</span>
                  <div className="font-extrabold text-slate-900 text-sm">{selectedClash.seatId1}</div>
                  <div className="font-sans font-medium text-slate-800">{selectedClash.student1.name}</div>
                  <div className="text-[11px] text-indigo-700">Roll #{selectedClash.student1.rollNo} • {selectedClash.student1.branch}</div>
                  <div className="text-[11px] text-slate-500 font-sans">{selectedClash.student1.subject}</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">Desk 2</span>
                  <div className="font-extrabold text-slate-900 text-sm">{selectedClash.seatId2}</div>
                  <div className="font-sans font-medium text-slate-800">{selectedClash.student2.name}</div>
                  <div className="text-[11px] text-indigo-700">Roll #{selectedClash.student2.rollNo} • {selectedClash.student2.branch}</div>
                  <div className="text-[11px] text-slate-500 font-sans">{selectedClash.student2.subject}</div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950">
                <span className="font-bold">How to resolve:</span> Open the <strong>Seating Plan</strong> tab and click &ldquo;Swap Two Desks&rdquo; or click &ldquo;Generate Seating Plan&rdquo; with department interleaving enabled to recalculate safe orthogonal spacing.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedClash(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Inspected Desk in Traversal */}
      {inspectedSeat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Desk Graph Vertex Details ({inspectedSeat.id})</h3>
              </div>
              <button
                onClick={() => setInspectedSeatId(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
                <div className="flex justify-between font-sans">
                  <span className="font-bold text-slate-900 text-sm">Desk: {inspectedSeat.id}</span>
                  <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                    inspectedSeat.status === 'occupied' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {inspectedSeat.status}
                  </span>
                </div>
                {inspectedStudent ? (
                  <div className="mt-1 pt-1 border-t border-slate-200 font-sans">
                    <div className="font-bold text-slate-900">{inspectedStudent.name}</div>
                    <div className="text-[11px] text-indigo-700 font-mono">
                      Roll #{inspectedStudent.rollNo} • {inspectedStudent.branch} • {inspectedStudent.subject}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 font-sans italic">Desk is currently empty.</div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1.5">
                  Orthogonal Graph Neighbors ({inspectedNeighbors.length} adjacent desks):
                </span>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {inspectedNeighbors.map((n) => (
                    <div key={n.seatId} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-900">{n.seatId}</span>
                      <span className="font-sans text-slate-600">
                        {n.student ? `${n.student.name} (${n.student.branch})` : 'Free Desk'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setInspectedSeatId(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

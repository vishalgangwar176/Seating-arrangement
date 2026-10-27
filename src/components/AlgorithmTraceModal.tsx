/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlgorithmTrace } from '../types';
import { X, Clock, Layers, CheckCircle, Terminal } from 'lucide-react';

interface AlgorithmTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: AlgorithmTrace | null;
  traceHistory: AlgorithmTrace[];
  onSelectHistoricalTrace: (trace: AlgorithmTrace) => void;
}

export const AlgorithmTraceModal: React.FC<AlgorithmTraceModalProps> = ({
  isOpen,
  onClose,
  trace,
  traceHistory,
  onSelectHistoricalTrace,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Execution Trace &amp; Steps</h2>
              <p className="text-xs text-slate-500">
                Step-by-step computer execution log and performance breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
            aria-label="Close trace panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Historical traces selector if multiple exist */}
        {traceHistory.length > 1 && (
          <div className="px-6 py-2 border-b border-slate-200 bg-slate-100/70 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 whitespace-nowrap font-medium">History:</span>
            {traceHistory.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectHistoricalTrace(t)}
                className={`px-2.5 py-1 rounded border text-[11px] whitespace-nowrap transition-colors ${
                  trace?.id === t.id
                    ? 'bg-slate-900 text-white border-slate-900 font-medium'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.algorithmName} ({t.timestamp.split('T')[1]?.slice(0, 5) || 'run'})
              </button>
            ))}
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {trace ? (
            <>
              {/* Algorithm identity header */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {trace.unit}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {new Date(trace.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{trace.algorithmName}</h3>
                <p className="text-xs text-slate-600 mt-1">{trace.problemSolved}</p>

                {/* Complexity badges */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200/80">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Time Complexity</div>
                    <div className="text-xs font-mono font-bold text-indigo-700 mt-0.5">
                      {trace.timeComplexity}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Space Complexity</div>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                      {trace.spaceComplexity}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Execution Time</div>
                    <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {trace.executionTimeMs} ms
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Operations</div>
                    <div className="text-xs font-mono font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {trace.operationCount} steps
                    </div>
                  </div>
                </div>
              </div>

              {/* Input summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Input Data</h4>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 font-mono">
                  {trace.inputSummary}
                </div>
              </div>

              {/* Step by step execution trace */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Step-by-Step Runtime Trace
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {trace.steps.length} sequential execution logs
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-200 rounded-lg p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2 border border-slate-800 shadow-inner">
                  {trace.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="text-slate-500 select-none text-[11px] w-6 shrink-0 text-right">
                        {(idx + 1).toString().padStart(2, '0')}:
                      </span>
                      <span className="leading-relaxed break-words">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Result summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Output & State Change</h4>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-800 mb-0.5">Algorithm Execution Succeeded</div>
                    <div className="text-emerald-700">{trace.resultSummary}</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Terminal className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No Algorithm Trace Recorded Yet</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Execute an action such as searching by roll number, generating a seating plan, running Dijkstra routing, or triggering an AVL rotation to inspect the execution trace.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Client-Side Deterministic Implementation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};

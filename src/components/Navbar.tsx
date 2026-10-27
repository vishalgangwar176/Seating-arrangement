/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Home, 
  Grid3X3, 
  Users, 
  ShieldAlert, 
  Navigation, 
  Presentation, 
  RotateCcw, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'seating' 
  | 'students' 
  | 'conflicts' 
  | 'campus' 
  | 'presentation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalStudents: number;
  totalUsableSeats: number;
  assignedCount: number;
  conflictCount: number;
  onResetDemo: () => void;
  onOpenTrace: () => void;
  hasLatestTrace: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalStudents,
  totalUsableSeats,
  assignedCount,
  conflictCount,
  onResetDemo,
  onOpenTrace,
  hasLatestTrace,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'seating', label: 'Seating Plan & Layout', icon: <Grid3X3 className="w-4 h-4" /> },
    { id: 'students', label: 'Students & Fast Search', icon: <Users className="w-4 h-4" /> },
    { 
      id: 'conflicts', 
      label: 'Cheating Check & Patrol', 
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: conflictCount > 0 ? `${conflictCount} alerts` : 'Zero Clashes'
    },
    { id: 'campus', label: 'Campus Routes & Budget', icon: <Navigation className="w-4 h-4" /> },
    { 
      id: 'presentation', 
      label: 'Presentation Guide & Tests', 
      icon: <Presentation className="w-4 h-4 text-emerald-600" />,
      badge: 'Viva'
    },
  ];

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
            EX
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                Exam Seating Arrangement System
              </h1>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                SDG 4: Quality Education
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Autonomous Hall Allocation, Anti-Cheating Seating &amp; Campus Navigation
            </p>
          </div>
        </div>

        {/* Live Status Counters & Primary Action */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg font-mono">
            <div>
              <span className="text-slate-500">Students: </span>
              <span className="font-bold text-slate-900">{totalStudents}</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-slate-500">Desks: </span>
              <span className="font-bold text-slate-900">{totalUsableSeats}</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-slate-500">Seated: </span>
              <span className="font-bold text-indigo-700">{assignedCount}</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <span className="text-slate-500">Cheating Clashes: </span>
              <span className={`font-bold ${conflictCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {conflictCount}
              </span>
            </div>
          </div>

          {/* Algorithm Trace Button */}
          <button
            onClick={onOpenTrace}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              hasLatestTrace
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Inspect algorithm execution logs and complexity breakdown"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Execution Trace</span>
            {hasLatestTrace && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            )}
          </button>

          {/* Reset Demo State Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset all candidate and hall data back to initial clean state?')) {
                onResetDemo();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="Reset dataset back to original state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1.5 overflow-x-auto py-2 scrollbar-thin">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : item.badge === 'Viva'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.badge === 'Zero Clashes'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

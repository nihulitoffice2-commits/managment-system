
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TaskStatus, ProjectStatus } from '../types.ts';
import { useData } from '../DataContext.tsx';

const GanttPage: React.FC = () => {
  const { tasks, projects } = useData();
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [lateFilter, setLateFilter] = useState<'all' | 'overdue'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const dayWidth = 35;
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);
  
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => {
      const p = projects.find(proj => proj.id === t.projectId);
      if (!p || p.isDeleted) return false;
      if (!showCompleted && p.status === ProjectStatus.COMPLETED) return false;
      if (selectedProjects.length > 0 && !selectedProjects.includes(t.projectId)) return false;
      return true;
    });

    // Apply late filter
    if (lateFilter === 'overdue') {
      filtered = filtered.filter(t => isLateToStart(t) || isLateToFinish(t));
    }

    return filtered;
  }, [tasks, projects, selectedProjects, showCompleted, lateFilter]);

  // Calculate date range based on all tasks
  const dateRange = useMemo(() => {
    if (filteredTasks.length === 0) {
      const start = new Date(today);
      return { start, end: new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000) };
    }
    const dates = filteredTasks.flatMap(t => [
      new Date(t.plannedStartDate),
      new Date(t.plannedEndDate)
    ]).filter(d => !isNaN(d.getTime()));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    // Pad by 7 days on each side
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    return { start: minDate, end: maxDate };
  }, [filteredTasks, today]);

  // Group tasks by project and sort
  const groupedTasks = useMemo(() => {
    const groups: Record<string, typeof filteredTasks> = {};
    filteredTasks.forEach(t => {
      if (!groups[t.projectId]) groups[t.projectId] = [];
      groups[t.projectId].push(t);
    });
    // Sort tasks within each group by start date
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.plannedStartDate).getTime() - new Date(b.plannedStartDate).getTime());
    });
    return groups;
  }, [filteredTasks]);

  const activeProjectsList = projects.filter(p => !p.isDeleted && (showCompleted ? true : p.status !== ProjectStatus.COMPLETED));

  const getDayPosition = (dateStr: string): number => {
    const d = new Date(dateStr);
    return Math.floor((d.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));
  };

  const getDuration = (startStr: string, endStr: string): number => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  };

  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));

  const isOverdue = (task: typeof tasks[0]): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(task.plannedEndDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate <= today && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED;
  };

  const isLateToStart = (task: typeof tasks[0]): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(task.plannedStartDate);
    startDate.setHours(0, 0, 0, 0);
    return startDate <= today && task.status === TaskStatus.NOT_STARTED;
  };

  const isLateToFinish = (task: typeof tasks[0]): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(task.plannedEndDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate <= today && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED;
  };

  const getTaskStatusColor = (task: typeof tasks[0]): string => {
    if (task.status === TaskStatus.DONE) return 'bg-green-500 border-green-600';
    if (task.status === TaskStatus.CANCELLED) return 'bg-slate-400 border-slate-500';
    if (isOverdue(task)) return 'bg-rose-600 border-rose-700 animate-pulse';
    if (task.hasIssue) return 'bg-orange-500 border-orange-600';
    if (task.status === TaskStatus.BLOCKED) return 'bg-red-500 border-red-600';
    if (task.status === TaskStatus.IN_PROGRESS) return 'bg-blue-600 border-blue-700';
    return 'bg-slate-400 border-slate-500';
  };

  // Auto-scroll to today's date on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayPosition = getDayPosition(todayStr);
      const scrollLeft = (todayPosition * dayWidth) - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollLeft);
    }
  }, [dateRange, todayStr]);

  return (
    <div className="h-screen flex flex-col space-y-6 text-right pb-6 overflow-hidden" dir="rtl">
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">לוח גאנט ניהולי</h1>
            <p className="text-slate-500 font-medium text-sm">ניהול זמן משימות וביצוע פרויקטים</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border">
              <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-xs font-bold text-slate-600">פרויקטים הושלמו</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLateFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  lateFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                כל המשימות
              </button>
              <button
                onClick={() => setLateFilter('overdue')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  lateFilter === 'overdue' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                }`}
              >
                באיחור
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase">בחר פרויקטים:</p>
          <div className="flex flex-wrap gap-2 items-center">
            {activeProjectsList.map(p => (
              <button 
                key={p.id} 
                onClick={() => setSelectedProjects(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                  selectedProjects.includes(p.id) ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col relative">
        <div ref={scrollContainerRef} className="overflow-auto custom-scrollbar flex-1">
          <div style={{ minWidth: dayWidth * totalDays + 280 }}>
            {/* Header with dates */}
            <div className="flex sticky top-0 bg-gradient-to-b from-slate-100 to-slate-50 border-b z-20">
              <div className="w-72 flex-shrink-0 p-4 font-black text-[10px] text-slate-500 border-l border-slate-300 uppercase bg-slate-50">משימה</div>
              <div className="flex-1 flex overflow-hidden">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const d = new Date(dateRange.start);
                  d.setDate(d.getDate() + i);
                  const isToday = d.toISOString().split('T')[0] === todayStr;
                  const isWeekend = d.getDay() === 5 || d.getDay() === 6;
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex-shrink-0 text-center border-l flex flex-col items-center justify-center ${
                        isToday ? 'bg-blue-50 border-l-2 border-l-blue-500' : isWeekend ? 'bg-red-50/40' : 'bg-white'
                      }`}
                      style={{ width: dayWidth }}
                    >
                      <div className={`text-[7px] font-black uppercase ${
                        isWeekend ? 'text-red-400' : 'text-slate-400'
                      }`}>{d.toLocaleDateString('he-IL', { weekday: 'short' })}</div>
                      <div className={`text-[10px] font-black ${isToday ? 'text-blue-700' : isWeekend ? 'text-red-500' : 'text-slate-600'}`}>{d.getDate()}</div>
                      {i % 7 === 0 && <div className="text-[7px] text-slate-400">{d.toLocaleDateString('he-IL', { month: 'short' })}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks grouped by project */}
            {Object.entries(groupedTasks).map(([projectId, projTasks]) => {
              const project = projects.find(p => p.id === projectId);
              if (!project) return null;
              
              return (
                <div key={projectId} className="border-b-2 border-slate-200">
                  {/* Project header */}
                  <div className="flex bg-gradient-to-r from-blue-50 to-white border-b">
                    <div className="w-72 flex-shrink-0 p-4 font-black text-sm text-blue-700 border-l border-blue-200 flex items-center gap-2">
                      <div style={{backgroundColor: project.color || '#3B82F6'}} className="w-3 h-3 rounded-full"></div>
                      {project.name}
                    </div>
                    <div className="flex-1 bg-blue-50"></div>
                  </div>

                  {/* Tasks */}
                  {projTasks.map(t => {
                    const startDay = getDayPosition(t.plannedStartDate);
                    const duration = getDuration(t.plannedStartDate, t.plannedEndDate);
                    const isOverdueTask = isOverdue(t);
                    const taskIsLateToStart = isLateToStart(t);
                    const taskIsLateToFinish = isLateToFinish(t);
                    
                    return (
                      <div 
                        key={t.id} 
                        className="flex group hover:bg-blue-50/30 transition-colors border-b border-slate-100"
                        onMouseEnter={() => setHoveredTaskId(t.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                      >
                        <div className="w-72 flex-shrink-0 p-3 border-l border-slate-200 flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 truncate">{t.name}</span>
                          {taskIsLateToStart && <span className="text-orange-600 font-black text-[10px] bg-orange-100 px-2 py-0.5 rounded">⏰ איחור התחלה</span>}
                          {taskIsLateToFinish && !taskIsLateToStart && <span className="text-rose-600 font-black text-[10px] bg-rose-100 px-2 py-0.5 rounded">📅 איחור סיום</span>}
                          {t.hasIssue && <span className="text-orange-600 animate-pulse text-xs font-black">⚠️</span>}
                        </div>
                        <div className="flex-1 relative h-12 bg-white">
                          {/* Today indicator line */}
                          {(() => {
                            const todayPosition = getDayPosition(todayStr);
                            if (todayPosition >= 0 && todayPosition <= totalDays) {
                              return (
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-20 pointer-events-none"
                                  style={{ left: todayPosition * dayWidth }}
                                >
                                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Render the task bar */}
                          {startDay >= -100 && startDay < totalDays + 100 && (
                            <div 
                              className={`absolute top-1/2 -translate-y-1/2 h-8 rounded border-l-4 flex items-center px-2 transition-all ${getTaskStatusColor(t)} ${hoveredTaskId === t.id ? 'shadow-lg scale-105 z-10' : ''}`}
                              style={{ 
                                left: Math.max(0, startDay * dayWidth), 
                                width: Math.max(40, duration * dayWidth),
                                opacity: hoveredTaskId && hoveredTaskId !== t.id ? 0.5 : 1
                              }}
                              title={`${t.name} (${t.plannedStartDate} עד ${t.plannedEndDate}) - ${t.progress}%`}
                            >
                              <span className="text-[9px] font-black text-white truncate whitespace-nowrap">{t.progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Empty state */}
            {filteredTasks.length === 0 && (
              <div className="flex items-center justify-center h-40 text-slate-400">
                <p className="font-bold">לא נמצאו משימות להצגה</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        <p className="text-xs font-black text-slate-400 uppercase mb-3">תרגיל:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-xs text-slate-600 font-bold">בביצוע</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs text-slate-600 font-bold">הושלמה</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-rose-600 animate-pulse rounded"></div>
            <span className="text-xs text-slate-600 font-bold">באיחור</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs text-slate-600 font-bold">בעיה</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs text-slate-600 font-bold">חסום</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-400 rounded"></div>
            <span className="text-xs text-slate-600 font-bold">בוטל</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GanttPage;

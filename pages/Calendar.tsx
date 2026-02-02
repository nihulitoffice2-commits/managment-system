
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, UserRole } from '../types.ts';
import { useData } from '../DataContext.tsx';
import Modal from '../components/Modal.tsx';
import { ICONS } from '../constants.tsx';

const CalendarPage: React.FC = () => {
  const { tasks: globalTasks, projects: globalProjects, contacts: globalContacts, meetings, addMeeting, updateMeeting, deleteMeeting, currentUser } = useData();
  const isSysAdmin = currentUser?.role === UserRole.SYS_ADMIN;
  const isPmAdmin = currentUser?.role === UserRole.PM_ADMIN;
  const canManageMeetings = isSysAdmin || isPmAdmin;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = new Date(todayStr);
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1)); 
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [view, setView] = useState('all');
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  const normalizeDate = (value?: string) => {
    if (!value) return '';
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch (e) {
      return value;
    }
  };

  const isTaskLate = (task: Task): boolean => {
    const endDate = new Date(normalizeDate(task.plannedEndDate));
    endDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(todayStr);
    todayDate.setHours(0, 0, 0, 0);
    return endDate <= todayDate && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED;
  };

  const getTaskType = (task: Task, dateStr: string): 'start' | 'end' | 'both' | null => {
    const startStr = normalizeDate(task.plannedStartDate);
    const endStr = normalizeDate(task.plannedEndDate);
    if (startStr === endStr && startStr === dateStr) return 'both';
    if (startStr === dateStr) return 'start';
    if (endStr === dateStr) return 'end';
    return null;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const count = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const arr = [];
    
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let i = 1; i <= count; i++) arr.push(new Date(year, month, i));
    return arr;
  }, [currentMonth]);

  const filteredTasks = useMemo(() => {
    return globalTasks.filter(task => {
      if (selectedProjects.length > 0 && !selectedProjects.includes(task.projectId)) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      if (view === 'overdue') {
        return isTaskLate(task);
      }
      if (view === 'with_issues') {
        return task.hasIssue;
      }
      if (view === 'active') {
        return task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED;
      }

      return true;
    });
  }, [globalTasks, selectedProjects, priorityFilter, view, todayStr]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, {task: Task; type: 'start' | 'end' | 'both'}[]> = {};
    filteredTasks.forEach(task => {
      // Add task to start date
      const startDateKey = normalizeDate(task.plannedStartDate);
      if (startDateKey) {
        if (!map[startDateKey]) map[startDateKey] = [];
        const type = getTaskType(task, startDateKey);
        if (type) map[startDateKey].push({task, type});
      }
      // Add task to end date (if different from start date)
      const endDateKey = normalizeDate(task.plannedEndDate);
      if (endDateKey && endDateKey !== startDateKey) {
        if (!map[endDateKey]) map[endDateKey] = [];
        map[endDateKey].push({task, type: 'end'});
      }
    });
    return map;
  }, [filteredTasks]);

  const meetingsByDay = useMemo(() => {
    const map: Record<string, typeof meetings> = {};
    (meetings || []).forEach(meeting => {
      if (!selectedProjects.length || !meeting.projectId || selectedProjects.includes(meeting.projectId)) {
        if (!map[meeting.date]) map[meeting.date] = [];
        map[meeting.date].push(meeting);
      }
    });
    return map;
  }, [meetings, selectedProjects]);

  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState<{date:string; time?:string; projectId?:string; contactId?:string; title:string; notes?:string}>({date: todayStr, title: ''});
  
  const openCreateMeetingModal = (date: string = todayStr) => {
    if (!canManageMeetings) return;
    setEditingMeetingId(null);
    setMeetingForm({date, title: ''});
    setMeetingModalOpen(true);
  };
  
  const openEditMeetingModal = (meeting: any) => {
    if (!canManageMeetings) return;
    setEditingMeetingId(meeting.id);
    setMeetingForm({date: meeting.date, time: meeting.time, projectId: meeting.projectId, contactId: meeting.contactId, title: meeting.title, notes: meeting.notes});
    setMeetingModalOpen(true);
  };

  const stats = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const lateTasks = filteredTasks.filter(isTaskLate).length;
    const totalMeetings = (meetings || []).filter(m => !selectedProjects.length || !m.projectId || selectedProjects.includes(m.projectId)).length;
    const doneTasks = filteredTasks.filter(t => t.status === TaskStatus.DONE).length;
    return { totalTasks, lateTasks, totalMeetings, doneTasks };
  }, [filteredTasks, meetings, selectedProjects]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">📅 לוח שנה</h1>
            <p className="text-slate-500 font-medium">ניהול משימות ופגישות חכם ויעיל</p>
          </div>
          {canManageMeetings && (
            <button 
              onClick={() => openCreateMeetingModal()} 
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xl">📆</span>
              <span>קבע פגישה חדשה</span>
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border-2 border-blue-200">
            <div className="text-2xl font-black text-blue-700">{stats.totalTasks}</div>
            <div className="text-xs font-bold text-blue-600">סה״כ משימות</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-2xl border-2 border-orange-200">
            <div className="text-2xl font-black text-orange-700">{stats.lateTasks}</div>
            <div className="text-xs font-bold text-orange-600">משימות באיחור</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-2xl border-2 border-purple-200">
            <div className="text-2xl font-black text-purple-700">{stats.totalMeetings}</div>
            <div className="text-xs font-bold text-purple-600">פגישות קרובות</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl border-2 border-green-200">
            <div className="text-2xl font-black text-green-700">{stats.doneTasks}</div>
            <div className="text-xs font-bold text-green-600">משימות הושלמו</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-72 space-y-4 flex-shrink-0">
          <div className="bg-white p-6 rounded-2xl border-2 shadow-lg space-y-5">
             <h4 className="font-black text-base text-slate-800 border-b-2 border-slate-200 pb-3 flex items-center gap-2">
               🔍 סינון וצפייה
             </h4>
             
             {/* View Type Filters */}
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-400 uppercase">סוג תצוגה</label>
               <div className="space-y-1.5">
                  <button onClick={() => setView('all')} className={`w-full text-right text-sm p-3 rounded-xl font-bold transition-all ${view === 'all' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    🌐 הכל
                  </button>
                  <button onClick={() => setView('active')} className={`w-full text-right text-sm p-3 rounded-xl font-bold transition-all ${view === 'active' ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    ⚡ משימות פעילות
                  </button>
                  <button onClick={() => setView('overdue')} className={`w-full text-right text-sm p-3 rounded-xl font-bold transition-all ${view === 'overdue' ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-md' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                    ⚠️ באיחור
                  </button>
                  <button onClick={() => setView('with_issues')} className={`w-full text-right text-sm p-3 rounded-xl font-bold transition-all ${view === 'with_issues' ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}>
                    🚩 עם תקלות
                  </button>
               </div>
             </div>

             {/* Show/Hide toggles */}
             <div className="space-y-2 pt-3 border-t-2">
               <label className="text-xs font-black text-slate-400 uppercase">הצג בלוח</label>
               <div className="space-y-2">
                 <label className="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border-2 hover:bg-slate-100 transition-all">
                   <input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                   <span className="text-sm font-bold text-slate-700">✅ משימות</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border-2 hover:bg-slate-100 transition-all">
                   <input type="checkbox" checked={showMeetings} onChange={(e) => setShowMeetings(e.target.checked)} className="w-5 h-5 text-purple-600 rounded" />
                   <span className="text-sm font-bold text-slate-700">📅 פגישות</span>
                 </label>
               </div>
             </div>
             
             {/* Project Filter */}
             <div className="pt-3 border-t-2 space-y-2">
               <label className="text-xs font-black text-slate-400 uppercase">פרויקטים</label>
               <div className="flex flex-wrap gap-2">
                 {globalProjects.filter(p => !p.isDeleted).map(p => (
                   <button 
                     key={p.id}
                     onClick={() => setSelectedProjects(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                     className={`px-3 py-2 rounded-lg text-xs font-black transition-all border-2 ${selectedProjects.includes(p.id) ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                   >
                     {p.name}
                   </button>
                 ))}
                 {selectedProjects.length > 0 && (
                   <button onClick={() => setSelectedProjects([])} className="px-3 py-2 rounded-lg text-xs font-black bg-slate-100 text-slate-600 border-2 border-slate-200 hover:bg-slate-200">
                     🔄 נקה הכל
                   </button>
                 )}
               </div>
             </div>

             {/* Priority Filter */}
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-400 uppercase">עדיפות</label>
               <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 font-bold text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none">
                 <option value="all">🌟 כל העדיפויות</option>
                 {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
               </select>
             </div>
          </div>

          {/* Legend */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-2xl border-2 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-slate-700 flex items-center gap-2">
              📖 מקרא
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-bold text-slate-600">▶️ התחלת משימה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-bold text-slate-600">🏁 סיום משימה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="font-bold text-slate-600">⚠️ משימה באיחור</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="font-bold text-slate-600">📅 פגישה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="font-bold text-slate-600">🚩 משימה עם תקלה</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 bg-white rounded-2xl border-2 shadow-lg overflow-hidden flex flex-col">
          {/* Calendar Header */}
          <div className="p-5 border-b-2 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
              📆 {currentMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-3">
              <button onClick={prevMonth} className="px-4 py-2 hover:bg-white border-2 rounded-xl transition-all shadow-sm font-bold text-slate-600 hover:text-blue-600 hover:border-blue-300">
                ◀️
              </button>
              <button onClick={nextMonth} className="px-4 py-2 hover:bg-white border-2 rounded-xl transition-all shadow-sm font-bold text-slate-600 hover:text-blue-600 hover:border-blue-300">
                ▶️
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b-2 bg-slate-100">
            {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((d, i) => (
              <div key={d} className={`py-3 text-center text-xs font-black ${
                i === 5 || i === 6 ? 'text-red-500' : 'text-slate-600'
              }`}>
                {d}
                {(i === 5 || i === 6) && <div className="text-[8px] text-red-400 font-normal">סגור</div>}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-slate-50/30">
            {days.map((day, idx) => {
              const dayStr = day?.toISOString().split('T')[0] || '';
              const dayTasks = (tasksByDay[dayStr] || []).filter(() => showTasks);
              const dayMeetings = (meetingsByDay[dayStr] || []).filter(() => showMeetings);
              const isToday = dayStr === todayStr;
              const dayOfWeek = day?.getDay();
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

              return (
                <div key={idx} className={`border-l border-b p-2 overflow-y-auto flex flex-col gap-1.5 transition-colors min-h-[120px] ${
                  !day ? 'bg-slate-100/50' : 
                  isToday ? 'bg-blue-50 border-blue-200 border-2' : 
                  isWeekend ? 'bg-red-50/30 opacity-60' :
                  'hover:bg-slate-50 bg-white'
                }`}>
                  {day && (
                    <div className="flex justify-between items-start mb-1 sticky top-0 bg-inherit z-10">
                      <span className={`text-sm font-black ${
                        isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md' : 
                        isWeekend ? 'text-red-500' :
                        'text-slate-500'
                      }`}>
                        {day.getDate()}
                      </span>
                      {!isWeekend && (
                        <button 
                          onClick={() => openCreateMeetingModal(dayStr)} 
                          className="text-[9px] px-2 py-1 rounded-lg bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 font-bold transition-all" 
                          title="קבע פגישה"
                        >
                          + 📅
                        </button>
                      )}
                      {isWeekend && (
                        <span className="text-[8px] text-red-400 font-bold">סגור</span>
                      )}
                    </div>
                  )}

                  {/* Tasks */}
                  {dayTasks.map(({task: t, type}) => {
                    const isLate = isTaskLate(t);
                    const isDone = t.status === TaskStatus.DONE;
                    
                    return (
                      <div 
                        key={`${t.id}-${type}`}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shadow-sm border-2 transition-all hover:shadow-md group ${
                          t.hasIssue ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          isLate ? 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse' :
                          isDone ? 'bg-green-100 text-green-800 border-green-300 opacity-75' :
                          type === 'start' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          type === 'end' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          'bg-cyan-100 text-cyan-800 border-cyan-300'
                        }`}
                        title={`${t.name}\n${type === 'start' ? '▶️ התחלה' : type === 'end' ? '🏁 סיום' : '▶️🏁 התחלה וסיום'}`}
                      >
                        <div className="flex items-center gap-1">
                          {type === 'start' && '▶️'}
                          {type === 'end' && '🏁'}
                          {type === 'both' && '▶️🏁'}
                          {t.hasIssue && '🚩'}
                          {isLate && !t.hasIssue && '⚠️'}
                          <span className="truncate flex-1">{t.name}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Meetings */}
                  {dayMeetings.map(m => {
                    const projectColor = m.projectId ? globalProjects.find(p => p.id === m.projectId)?.color : undefined;
                    const bgColor = projectColor || '#C084FC';
                    const borderColor = projectColor || '#9333EA';
                    
                    return (
                      <div 
                        key={m.id} 
                        onClick={() => openEditMeetingModal(m)} 
                        style={{backgroundColor: bgColor, borderColor: borderColor}} 
                        className="px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shadow-sm border-2 hover:shadow-md transition-all text-white"
                        title={`${m.title}${m.time ? `\n🕐 ${m.time}` : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span className="truncate flex-1">{m.title}</span>
                          {m.time && <span className="text-[9px] opacity-90">{m.time.substring(0, 5)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={meetingModalOpen} onClose={() => setMeetingModalOpen(false)} title={editingMeetingId ? "עדכן פגישה" : "פגישה חדשה"}>
        <form onSubmit={(e) => { e.preventDefault(); if (!canManageMeetings) return; const orgId = globalProjects[0]?.organizationId || 'org_client_1'; if (editingMeetingId) { updateMeeting(editingMeetingId, meetingForm); } else { addMeeting({ id: '', organizationId: orgId, ...meetingForm } as any); } setMeetingModalOpen(false); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase">כותרת *</label>
              <input required value={meetingForm.title} onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} className="w-full bg-slate-50 rounded-2xl px-4 py-3 border-2 focus:border-purple-400 outline-none font-medium" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase">תאריך *</label>
              <input type="date" required value={meetingForm.date} onChange={e => setMeetingForm({...meetingForm, date: e.target.value})} className="w-full bg-slate-50 rounded-2xl px-4 py-3 border-2 focus:border-purple-400 outline-none font-medium" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase">שעה</label>
              <input type="time" value={meetingForm.time || ''} onChange={e => setMeetingForm({...meetingForm, time: e.target.value})} className="w-full bg-slate-50 rounded-2xl px-4 py-3 border-2 focus:border-purple-400 outline-none font-medium" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase">פרויקט</label>
              <select value={meetingForm.projectId || ''} onChange={e => setMeetingForm({...meetingForm, projectId: e.target.value || undefined, contactId: undefined})} className="w-full bg-slate-50 rounded-2xl px-4 py-3 border-2 focus:border-purple-400 outline-none font-medium">
                <option value="">ללא</option>
                {globalProjects.filter(p => !p.isDeleted).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase">לקוח / איש קשר</label>
              <select value={meetingForm.contactId || ''} onChange={e => setMeetingForm({...meetingForm, contactId: e.target.value || undefined})} className="w-full bg-slate-50 rounded-2xl px-4 py-3 border-2 focus:border-purple-400 outline-none font-medium">
                <option value="">בחר איש קשר...</option>
                {globalContacts.filter(c => {
                  const ids = c.projectIds?.length ? c.projectIds : (c.projectId ? [c.projectId] : []);
                  if (!meetingForm.projectId) return true;
                  return ids.includes('all') || ids.includes(meetingForm.projectId);
                }).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase">הערות</label>
              <textarea value={meetingForm.notes || ''} onChange={e => setMeetingForm({...meetingForm, notes: e.target.value})} rows={3} className="w-full bg-slate-50 rounded-2xl px-4 py-3 border-2 focus:border-purple-400 outline-none font-medium"></textarea>
            </div>
          </div>
          <div className="flex justify-start gap-4 pt-4 border-t-2">
            <button type="submit" className="px-8 py-3 rounded-2xl font-black bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all">
              {editingMeetingId ? '✅ עדכן' : '💾 שמור'} פגישה
            </button>
            {editingMeetingId && canManageMeetings && (
              <button type="button" onClick={() => { deleteMeeting(editingMeetingId); setMeetingModalOpen(false); }} className="px-8 py-3 rounded-2xl font-black bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-200 transition-all">
                🗑️ מחק
              </button>
            )}
            <button type="button" onClick={() => setMeetingModalOpen(false)} className="px-8 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
              ✖️ ביטול
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CalendarPage;

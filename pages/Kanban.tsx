
import React, { useMemo, useState } from 'react';
import { TaskStatus, TaskPriority, ProjectStatus } from '../types.ts';
import { useData } from '../DataContext.tsx';
import Modal from '../components/Modal.tsx';

const KanbanPage: React.FC = () => {
  const { tasks, projects, updateTask: originalUpdateTask } = useData();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [view, setView] = useState<'all' | 'overdue'>('all');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Wrapper function to handle automatic date updates
  const updateTask = (taskId: string, updates: Partial<any>) => {
    const task = tasks.find(t => t.id === taskId);
    const todayDate = new Date().toISOString().split('T')[0];
    
    if (updates.status && task) {
      // If changing to IN_PROGRESS and no actual start date, set it
      if (updates.status === TaskStatus.IN_PROGRESS && !task.actualStartDate) {
        updates.actualStartDate = todayDate;
      }
      // If changing to DONE and no actual end date, set it
      if (updates.status === TaskStatus.DONE && !task.actualEndDate) {
        updates.actualEndDate = todayDate;
        updates.progress = 100;
      }
    }
    
    originalUpdateTask(taskId, updates);
  };
  
  const normalizeDate = (value?: string) => {
    if (!value) return '';
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch (e) {
      return value;
    }
  };
  const isOverdue = (t: any) => {
    if (!t?.plannedEndDate) return false;
    const endStr = normalizeDate(t.plannedEndDate);
    if (!endStr) return false;
    return endStr <= todayStr && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED;
  };

  const isLateToStart = (t: any) => {
    if (!t?.plannedStartDate) return false;
    const startStr = normalizeDate(t.plannedStartDate);
    if (!startStr) return false;
    return startStr <= todayStr && t.status === TaskStatus.NOT_STARTED;
  };

  const isLateToFinish = (t: any) => {
    if (!t?.plannedEndDate) return false;
    const endStr = normalizeDate(t.plannedEndDate);
    if (!endStr) return false;
    return endStr <= todayStr && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED;
  };

  const activeTasks = useMemo(() => {
    const base = tasks.filter(t => {
      const p = projects.find(proj => proj.id === t.projectId);
      if (!p || p.isDeleted) return false;
      if (selectedProjects.length > 0 && !selectedProjects.includes(t.projectId)) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });

    if (view === 'overdue') return base.filter(t => isLateToStart(t) || isLateToFinish(t));
    return base.filter(t => {
      const p = projects.find(proj => proj.id === t.projectId);
      return p && p.status !== ProjectStatus.COMPLETED;
    });
  }, [tasks, projects, view, todayStr, selectedProjects, priorityFilter]);

  const columns = [
    { id: TaskStatus.NOT_STARTED, title: 'טרם התחיל', color: 'bg-slate-100 text-slate-600' },
    { id: TaskStatus.IN_PROGRESS, title: 'בתהליך', color: 'bg-blue-50 text-blue-700' },
    { id: TaskStatus.BLOCKED, title: 'תקוע', color: 'bg-rose-50 text-rose-700' },
    { id: TaskStatus.DONE, title: 'הושלם', color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div className="h-full flex flex-col space-y-6 text-right" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">לוח קנבן</h1>
        <p className="text-slate-500 font-medium italic">משימות פרויקטים פעילים בלבד</p>
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-fit overflow-x-auto whitespace-nowrap">
          {[
            { id: 'all', label: 'כל המשימות' },
            { id: 'overdue', label: 'באיחור' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as 'all' | 'overdue')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${view === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center mt-2">
          {projects.filter(p => !p.isDeleted).map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProjects(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${selectedProjects.includes(p.id) ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {p.name}
            </button>
          ))}
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="px-3 py-1.5 rounded-lg text-[10px] bg-white border border-slate-200">
            <option value="all">כל העדיפויות</option>
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {selectedProjects.length > 0 && (
            <button onClick={() => setSelectedProjects([])} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600">נקה סינון פרויקטים</button>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {columns.map(col => (
          <div key={col.id} className="w-80 flex-shrink-0 flex flex-col bg-slate-100/40 rounded-[2rem] p-4 border border-slate-200/50">
            <div className={`flex items-center justify-between mb-6 px-3 py-2 rounded-xl ${col.color}`}>
              <h3 className="font-black text-sm uppercase tracking-widest">{col.title}</h3>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white/50">{activeTasks.filter(t => t.status === col.id).length}</span>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto px-1 custom-scrollbar">
              {activeTasks.filter(t => t.status === col.id).map(task => {
                const taskIsLateToStart = isLateToStart(task);
                const taskIsLateToFinish = isLateToFinish(task);
                const taskIsLate = taskIsLateToStart || taskIsLateToFinish;
                return (
                <div key={task.id} onClick={() => { setSelectedTask(task); setDetailModalOpen(true); }} className={`p-5 rounded-2xl shadow-sm border hover:shadow-md transition-all group cursor-pointer ${
                  taskIsLate ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex gap-1 items-center">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          task.priority === TaskPriority.URGENT ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
                       }`}>
                         {task.priority}
                       </span>
                       {taskIsLate && <span className="text-orange-500 text-sm" title="באיחור">⚠</span>}
                     </div>
                     {task.hasIssue && <span className="text-rose-600">🚩</span>}
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2 leading-relaxed">{task.name}</h4>
                  {taskIsLateToStart && <p className="text-xs text-orange-600 font-bold mb-2">🕐 היה אמור להתחיל: {task.plannedStartDate}</p>}
                  {taskIsLateToFinish && !taskIsLateToStart && <p className="text-xs text-orange-600 font-bold mb-2">📅 היה אמור להסתיים: {task.plannedEndDate}</p>}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                      {projects.find(p => p.id === task.projectId)?.name}
                    </span>
                    <div className="flex gap-1">
                       {columns.filter(c => c.id !== col.id).map(c => (
                         <button 
                            key={c.id} 
                            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: c.id as TaskStatus }); }}
                            className="w-5 h-5 rounded-full border border-slate-200 text-[8px] flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                            title={`העבר ל-${c.title}`}
                         >
                           {c.title.charAt(0)}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedTask ? `פרטי משימה: ${selectedTask.name}` : 'פרטי משימה'}>
        {selectedTask && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar p-1 text-right" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">שם</p><p className="font-black text-lg text-slate-900">{selectedTask.name}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סטטוס</p><p className={`font-bold ${selectedTask.status === TaskStatus.DONE ? 'text-green-600' : selectedTask.status === TaskStatus.IN_PROGRESS ? 'text-blue-600' : 'text-slate-600'}`}>{selectedTask.status}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">עדיפות</p><p className="font-bold text-slate-800">{selectedTask.priority}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">תחילה מתוכננת</p><p className="font-bold text-slate-800">{selectedTask.plannedStartDate}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סיום מתוכנן</p><p className="font-bold text-slate-800">{selectedTask.plannedEndDate}</p></div>
              {selectedTask.actualStartDate && (
                <div><p className="text-xs font-black text-slate-400 uppercase mb-1">תחילה בפועל</p><p className="font-bold text-slate-800">{selectedTask.actualStartDate}</p></div>
              )}
            </div>

            {selectedTask.description && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">פרטים / תיאור</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask.dependsOnTaskId && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">משימה קודמת (תלות)</p>
                {tasks.find(t => t.id === selectedTask.dependsOnTaskId) && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="font-bold text-blue-900">{tasks.find(t => t.id === selectedTask.dependsOnTaskId)?.name}</p>
                    <p className="text-sm text-blue-700">{tasks.find(t => t.id === selectedTask.dependsOnTaskId)?.status}</p>
                  </div>
                )}
              </div>
            )}

            {tasks.some(t => t.dependsOnTaskId === selectedTask.id) && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">משימות תלויות</p>
                <div className="space-y-2">
                  {tasks.filter(t => t.dependsOnTaskId === selectedTask.id).map(t => (
                    <div key={t.id} className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <p className="font-bold text-green-900">{t.name}</p>
                      <p className="text-sm text-green-700">{t.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-start gap-4 pt-4 border-t">
              <button type="button" onClick={() => setDetailModalOpen(false)} className="px-8 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">סגור</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KanbanPage;

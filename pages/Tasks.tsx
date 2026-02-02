
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, SchedulingMode, TaskItemType, TaskCategory, UserRole } from '../types.ts';
import Modal from '../components/Modal.tsx';
import { useData } from '../DataContext.tsx';
import { ICONS } from '../constants.tsx';

const TODAY = new Date();
const TODAY_STR = TODAY.toISOString().split('T')[0];

const TasksPage: React.FC = () => {
  const { tasks, projects, users, contacts, saving, addTask, updateTask: originalUpdateTask, deleteTask, currentUser } = useData();
  const [view, setView] = useState('active'); 
  const [filter, setFilter] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'project' | 'plannedStart' | 'plannedEnd'>('plannedEnd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalData, setModalData] = useState<Partial<Task>>({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draftSubtasks, setDraftSubtasks] = useState<Array<{ id: string; name: string; plannedStartDate: string; plannedEndDate: string; status: TaskStatus; performerContactId?: string }>>([]);
  const [subtaskDraft, setSubtaskDraft] = useState<{ name: string; plannedStartDate: string; plannedEndDate: string; status: TaskStatus; performerContactId?: string }>({
    name: '',
    plannedStartDate: TODAY_STR,
    plannedEndDate: TODAY_STR,
    status: TaskStatus.NOT_STARTED,
    performerContactId: undefined
  });
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingDraftSubtaskId, setEditingDraftSubtaskId] = useState<string | null>(null);

  const isSysAdmin = currentUser?.role === UserRole.SYS_ADMIN;
  const isPmAdmin = currentUser?.role === UserRole.PM_ADMIN;
  const isWorker = currentUser?.role === UserRole.WORKER;
  const canCreateTask = isSysAdmin || isPmAdmin || isWorker;
  const canDeleteTask = isSysAdmin || isPmAdmin;

  const isTaskRelatedToUser = (task: Task) => {
    if (!currentUser) return false;
    if (task.assignees?.includes(currentUser.id)) return true;
    if (task.performerContactId) {
      const contact = contacts.find(c => c.id === task.performerContactId);
      if (contact?.email && contact.email === currentUser.email) return true;
    }
    return false;
  };

  const canEditTask = (task: Task) => {
    if (isSysAdmin || isPmAdmin) return true;
    if (isWorker) return isTaskRelatedToUser(task);
    return false;
  };
  const [templateTaskId, setTemplateTaskId] = useState('');

  // Wrapper function to handle automatic date updates
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId);
    const today = new Date().toISOString().split('T')[0];
    
    if (updates.status && task) {
      // If changing to IN_PROGRESS and no actual start date, set it
      if (updates.status === TaskStatus.IN_PROGRESS && !task.actualStartDate) {
        updates.actualStartDate = today;
      }
      // If changing to DONE and no actual end date, set it
      if (updates.status === TaskStatus.DONE && !task.actualEndDate) {
        updates.actualEndDate = today;
        updates.progress = 100;
      }
    }
    
    originalUpdateTask(taskId, updates);
  };

  useEffect(() => {
    if (editingTask) {
      setModalData(editingTask);
    } else {
      setModalData({
        projectId: projects[0]?.id || '',
        itemType: TaskItemType.TASK,
        category: TaskCategory.OPERATIONS,
        schedulingMode: SchedulingMode.FIXED,
        plannedStartDate: TODAY_STR,
        plannedEndDate: TODAY_STR,
        workDays: 1,
        progress: 0,
        assignees: [],
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.MEDIUM,
        hasIssue: false
      });
    }
    setTemplateTaskId('');
    setDraftSubtasks([]);
    setSubtaskDraft({
      name: '',
      plannedStartDate: editingTask?.plannedStartDate || TODAY_STR,
      plannedEndDate: editingTask?.plannedEndDate || TODAY_STR,
      status: TaskStatus.NOT_STARTED,
      performerContactId: undefined
    });
    setEditingSubtaskId(null);
    setEditingDraftSubtaskId(null);
  }, [editingTask, projects, isModalOpen]);

  const applyTemplateTask = (taskId: string) => {
    const template = tasks.find(t => t.id === taskId);
    if (!template) return;

    setTemplateTaskId(taskId);
    const currentProjectId = (modalData.projectId as string) || template.projectId || '';
    setModalData({
      projectId: currentProjectId,
      itemType: TaskItemType.TASK,
      name: template.name,
      description: template.description,
      role: template.role,
      category: template.category,
      assignees: [],
      performerContactId: undefined,
      priority: template.priority,
      status: TaskStatus.NOT_STARTED,
      progress: 0,
      dependencies: [],
      schedulingMode: template.schedulingMode,
      parentTaskId: undefined,
      parentId: undefined,
      dependsOnTaskId: undefined,
      workDays: template.workDays,
      plannedStartDate: template.plannedStartDate || TODAY_STR,
      plannedEndDate: template.plannedEndDate || TODAY_STR,
      actualStartDate: undefined,
      actualEndDate: undefined,
      notes: template.notes,
      hasIssue: false,
      issueDetail: undefined
    });

    const templateSubtasks = tasks
      .filter(t => t.parentTaskId === template.id && t.itemType === TaskItemType.SUB_TASK)
      .map(t => ({
        id: `draft-${t.id}`,
        name: t.name,
        plannedStartDate: t.plannedStartDate,
        plannedEndDate: t.plannedEndDate,
        status: t.status,
        performerContactId: t.performerContactId
      }));
    setDraftSubtasks(templateSubtasks);
  };

  const templateSuggestions = useMemo(() => {
    if (editingTask) return [];
    const q = (modalData.name || '').toString().trim();
    if (!q) return [];
    return tasks
      .filter(t => t.itemType !== TaskItemType.SUB_TASK)
      .filter(t => t.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 6);
  }, [tasks, modalData.name, editingTask]);

  const filteredTasks = useMemo(() => {
    const normalized = tasks.filter(task => {
      if (task.itemType === TaskItemType.SUB_TASK) return false;
      const matchesSearch = task.name.toLowerCase().includes(filter.toLowerCase());
      if (!matchesSearch) return false;
      const isDone = task.status === TaskStatus.DONE;
      const isCancelled = task.status === TaskStatus.CANCELLED;
      const plannedEnd = new Date(task.plannedEndDate);
      plannedEnd.setHours(0, 0, 0, 0);
      const plannedStart = new Date(task.plannedStartDate);
      plannedStart.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isLateToFinish = !isDone && !isCancelled && plannedEnd <= today;
      const isLateToStart = task.status === TaskStatus.NOT_STARTED && plannedStart <= today;
      if (selectedProjects.length > 0 && !selectedProjects.includes(task.projectId)) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (dateFrom && task.plannedEndDate < dateFrom) return false;
      if (dateTo && task.plannedEndDate > dateTo) return false;

      switch (view) {
        case 'active': return !isDone && !isCancelled;
        case 'overdue': return isLateToStart || isLateToFinish;
        case 'with_issues': return task.hasIssue;
        case 'completed': return isDone;
        default: return true;
      }
    });

    const compare = (a: Task, b: Task) => {
      let av = '';
      let bv = '';
      if (sortBy === 'project') {
        av = projects.find(p => p.id === a.projectId)?.name || '';
        bv = projects.find(p => p.id === b.projectId)?.name || '';
      } else if (sortBy === 'plannedStart') {
        av = a.plannedStartDate || '';
        bv = b.plannedStartDate || '';
      } else {
        av = a.plannedEndDate || '';
        bv = b.plannedEndDate || '';
      }
      if (av === bv) return 0;
      const res = av < bv ? -1 : 1;
      return sortDir === 'asc' ? res : -res;
    };

    return normalized.slice().sort(compare);
  }, [tasks, view, filter, selectedProjects, statusFilter, priorityFilter, dateFrom, dateTo, sortBy, sortDir, projects]);

  const handleOpenNew = () => { if (!canCreateTask) return; setEditingTask(null); setModalOpen(true); };
  const handleOpenEdit = (task: Task) => { if (!canEditTask(task)) return; setEditingTask(task); setModalOpen(true); };
  const handleOpenDetail = (task: Task) => { setSelectedTask(task); setDetailModalOpen(true); };

  const contactMatchesProject = (contact: any, projectId?: string) => {
    const ids = contact.projectIds?.length ? contact.projectIds : (contact.projectId ? [contact.projectId] : []);
    if (ids.includes('all')) return true;
    if (!projectId) return false;
    return ids.includes(projectId);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      if (!canEditTask(editingTask)) return;
      updateTask(editingTask.id, modalData);
    } else {
      if (!canCreateTask) return;
      const assignees = isWorker && currentUser ? [currentUser.id] : (modalData.assignees || []);
      const createdId = await addTask({ 
        id: '', 
        organizationId: 'o1', 
        ...modalData,
        assignees
      } as any);

      if (createdId) {
        for (const sub of draftSubtasks) {
          const subAssignees = isWorker && currentUser ? [currentUser.id] : [];
          await addTask({
            id: '',
            organizationId: 'o1',
            projectId: modalData.projectId as string,
            itemType: TaskItemType.SUB_TASK,
            parentTaskId: createdId,
            parentId: createdId,
            name: sub.name,
            description: '',
            category: (modalData.category as TaskCategory) || TaskCategory.OPERATIONS,
            assignees: subAssignees,
            priority: (modalData.priority as TaskPriority) || TaskPriority.MEDIUM,
            performerContactId: sub.performerContactId,
            status: sub.status,
            progress: sub.status === TaskStatus.DONE ? 100 : 0,
            dependencies: [],
            schedulingMode: SchedulingMode.FIXED,
            workDays: 1,
            plannedStartDate: sub.plannedStartDate,
            plannedEndDate: sub.plannedEndDate,
            hasIssue: false
          } as any);
        }
      }
    }
    setModalOpen(false);
  };

  const existingSubtasks = useMemo(() => {
    if (!editingTask) return [];
    return tasks.filter(t => t.parentTaskId === editingTask.id && t.itemType === TaskItemType.SUB_TASK);
  }, [tasks, editingTask]);

  const handleAddSubtask = async () => {
    if (!subtaskDraft.name.trim()) return;

    if (editingTask) {
      const subAssignees = isWorker && currentUser ? [currentUser.id] : [];
      await addTask({
        id: '',
        organizationId: editingTask.organizationId || 'o1',
        projectId: editingTask.projectId,
        itemType: TaskItemType.SUB_TASK,
        parentTaskId: editingTask.id,
        parentId: editingTask.id,
        name: subtaskDraft.name.trim(),
        description: '',
        category: editingTask.category,
        assignees: subAssignees,
        priority: editingTask.priority,
        performerContactId: subtaskDraft.performerContactId,
        status: subtaskDraft.status,
        progress: subtaskDraft.status === TaskStatus.DONE ? 100 : 0,
        dependencies: [],
        schedulingMode: SchedulingMode.FIXED,
        workDays: 1,
        plannedStartDate: subtaskDraft.plannedStartDate,
        plannedEndDate: subtaskDraft.plannedEndDate,
        hasIssue: false
      } as any);
    } else {
      setDraftSubtasks(prev => [
        ...prev,
        {
          id: `draft-${Date.now()}`,
          name: subtaskDraft.name.trim(),
          plannedStartDate: subtaskDraft.plannedStartDate,
          plannedEndDate: subtaskDraft.plannedEndDate,
          status: subtaskDraft.status,
          performerContactId: subtaskDraft.performerContactId
        }
      ]);
    }

    setSubtaskDraft({
      name: '',
      plannedStartDate: modalData.plannedStartDate as string || TODAY_STR,
      plannedEndDate: modalData.plannedEndDate as string || TODAY_STR,
      status: TaskStatus.NOT_STARTED,
      performerContactId: undefined
    });
  };

  return (
    <div className="space-y-6 text-right pb-12" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ניהול משימות</h1>
          <p className="text-slate-500 font-medium italic">מעקב תפעולי מלא אחר ביצוע המשימות בכל הפרויקטים</p>
        </div>
        {canCreateTask && (
          <button onClick={handleOpenNew} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">+ משימה חדשה</button>
        )}
      </div>

      <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-fit overflow-x-auto whitespace-nowrap">
          {[
            { id: 'active', label: 'משימות פעילות' },
            { id: 'overdue', label: 'באיחור' },
            { id: 'with_issues', label: 'עם תקלות 🚩' },
            { id: 'completed', label: 'הושלמו' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${view === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input 
            type="text" 
            placeholder="חפש משימה..." 
            className="flex-1 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2 rounded-2xl bg-slate-50 text-sm">
            <option value="all">כל הסטטוסים</option>
            {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="px-3 py-2 rounded-2xl bg-slate-50 text-sm">
            <option value="all">כל העדיפויות</option>
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-2xl bg-slate-50 text-sm" />
            <span className="text-xs text-slate-400">עד</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-2xl bg-slate-50 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-2xl bg-slate-50 text-sm">
              <option value="plannedEnd">מיין לפי סיום מתוכנן</option>
              <option value="plannedStart">מיין לפי תחילה מתוכננת</option>
              <option value="project">מיין לפי פרויקט</option>
            </select>
            <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="px-3 py-2 rounded-2xl bg-slate-50 text-sm">
              <option value="asc">עולה</option>
              <option value="desc">יורד</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {projects.filter(p => !p.isDeleted).map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProjects(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${selectedProjects.includes(p.id) ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {p.name}
            </button>
          ))}
          {selectedProjects.length > 0 && (
            <button onClick={() => setSelectedProjects([])} className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600">נקה סינון פרויקטים</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
        <table className="w-full text-right border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 text-[10px] text-slate-400 font-black border-b uppercase tracking-widest">
            <tr>
              <th className="px-6 py-5">משימה / קטגוריה</th>
              <th className="px-6 py-5">פרויקט</th>
              <th className="px-6 py-5 text-center">סטטוס</th>
              <th className="px-6 py-5 text-center">מבצע</th>
              <th className="px-6 py-5 text-center">תחילה מתוכננת</th>
              <th className="px-6 py-5 text-center">סיום מתוכנן</th>
              <th className="px-6 py-5 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y">
            {filteredTasks.map(task => {
              const proj = projects.find(p => p.id === task.projectId);
              const projectColor = proj?.color || '#cbd5e1';
              const performer = contacts.find(c => c.id === task.performerContactId);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const startDate = new Date(task.plannedStartDate);
              const endDate = new Date(task.plannedEndDate);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(0, 0, 0, 0);
              const isLateToStart = task.status === TaskStatus.NOT_STARTED && startDate <= today;
              const isLateToFinish = task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED && endDate <= today;
              const isLate = isLateToStart || isLateToFinish;
              
              return (
                <tr key={task.id} style={{ borderRight: `4px solid ${projectColor}` }} className={`transition-colors group ${
                  isLate ? 'bg-orange-50/50 hover:bg-orange-100/50' : 'hover:bg-slate-50/50'
                }`}>
                  <td className="px-6 py-5">
                    <button onClick={() => handleOpenDetail(task)} className="flex items-center gap-3 hover:text-blue-600 transition-colors">
                      {isLate && <span className="text-orange-500" title="באיחור">⚠</span>}
                      {task.hasIssue && <span className="text-rose-500 animate-pulse" title={task.issueDetail}>🚩</span>}
                      <div className="text-right">
                        <p className="font-black text-slate-900">{task.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{task.category}</p>
                        {isLateToStart && <p className="text-xs text-orange-600 font-bold">🕐 היה אמור להתחיל: {task.plannedStartDate}</p>}
                        {isLateToFinish && !isLateToStart && <p className="text-xs text-orange-600 font-bold">📅 היה אמור להסתיים: {task.plannedEndDate}</p>}
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }}></span>
                      {proj?.name || 'ללא פרויקט'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <select 
                        value={task.status} 
                        onChange={(e) => { if (!canEditTask(task)) return; updateTask(task.id, { status: e.target.value as TaskStatus }); }}
                        disabled={!canEditTask(task)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black border-none ${
                          task.status === TaskStatus.DONE ? 'bg-green-100 text-green-700' :
                          task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                          task.status === TaskStatus.BLOCKED ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-500'
                        } ${canEditTask(task) ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                      >
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="font-bold text-slate-700">{performer?.name || 'טרם שובץ'}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-xs font-bold text-slate-500">{task.plannedStartDate}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`font-bold ${new Date(task.plannedEndDate) < TODAY && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED ? 'text-rose-600' : 'text-slate-500'}`}>
                      {task.plannedEndDate}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-left">
                    <div className="flex items-center gap-2">
                      {canEditTask(task) && (
                        <button onClick={() => handleOpenEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100" title="ערוך משימה">
                          <ICONS.Dashboard className="w-5 h-5" />
                        </button>
                      )}
                      {canDeleteTask && (
                        <button onClick={() => {
                          if (confirm('האם אתה בטוח שברצונך למחוק משימה זו? (הסטטוס יתעדכן לבוטל)')) {
                            updateTask(task.id, { status: TaskStatus.CANCELLED });
                          }
                        }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100" title="מחק משימה">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-400 font-bold italic">לא נמצאו משימות התואמות את החיפוש</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'עריכת משימה' : 'משימה חדשה'}>
        <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">שם המשימה *</label>
              <div className="relative">
                <input
                  required
                  value={modalData.name || ''}
                  onChange={e => {
                    const nextValue = e.target.value;
                    setModalData({ ...modalData, name: nextValue });
                    if (templateTaskId) {
                      const template = tasks.find(t => t.id === templateTaskId);
                      if (template && nextValue !== template.name) {
                        setTemplateTaskId('');
                        setDraftSubtasks([]);
                      }
                    }
                  }}
                  className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="התחל להקליד... אפשר גם לשכפל ממשימה קיימת"
                />
                {!editingTask && templateSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {templateSuggestions.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplateTask(t.id)}
                        className="w-full text-right px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800">{t.name}</span>
                        <span className="text-[10px] text-slate-500">{projects.find(p => p.id === t.projectId)?.name || 'ללא פרויקט'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!editingTask && (
                <p className="text-[10px] text-slate-400">
                  אפשר להקליד שם חדש, או לבחור מהרשימה לשכפול מלא כולל תתי־משימות.
                </p>
              )}
            </div>
            
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">פרטים / תיאור</label>
              <textarea value={modalData.description || ''} onChange={e => setModalData({...modalData, description: e.target.value})} placeholder="הוסף פרטים על המשימה..." rows={3} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">פרויקט משויך *</label>
              <select required value={modalData.projectId || ''} onChange={e => setModalData({...modalData, projectId: e.target.value, performerContactId: undefined})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">קטגוריה</label>
              <select value={modalData.category || ''} onChange={e => setModalData({...modalData, category: e.target.value as TaskCategory})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                {Object.values(TaskCategory).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">מבצע (איש קשר)</label>
              <select value={modalData.performerContactId || ''} onChange={e => setModalData({...modalData, performerContactId: e.target.value || undefined})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                <option value="">--- לא שובץ ---</option>
                {contacts.filter(c => contactMatchesProject(c, modalData.projectId as string)).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">תאריך התחלה מתוכנן</label>
              <input type="date" value={modalData.plannedStartDate || ''} onChange={e => setModalData({...modalData, plannedStartDate: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">תאריך סיום מתוכנן</label>
              <input type="date" value={modalData.plannedEndDate || ''} onChange={e => setModalData({...modalData, plannedEndDate: e.target.value})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">תאריך התחלה בפועל (יתעדכן אוטומטי)</label>
              <input type="date" value={modalData.actualStartDate || ''} readOnly disabled className="w-full border-slate-200 bg-slate-100 rounded-2xl px-4 py-3 text-slate-500 cursor-not-allowed" />
              <p className="text-xs text-slate-400 italic">מתעדכן אוטומטית כשהמשימה עוברת לסטטוס "בתהליך"</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">תאריך סיום בפועל (יתעדכן אוטומטי)</label>
              <input type="date" value={modalData.actualEndDate || ''} readOnly disabled className="w-full border-slate-200 bg-slate-100 rounded-2xl px-4 py-3 text-slate-500 cursor-not-allowed" />
              <p className="text-xs text-slate-400 italic">מתעדכן אוטומטית כשהמשימה עוברת לסטטוס "הושלם"</p>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">משימה קודמת (תלות) - המשימה תהפוך לפעילה בעת השלמתה</label>
              <select value={modalData.dependsOnTaskId || ''} onChange={e => setModalData({...modalData, dependsOnTaskId: e.target.value || undefined})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                <option value="">--- אין משימה קודמת ---</option>
                {tasks.filter(t => t.projectId === modalData.projectId && t.id !== editingTask?.id).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">סטטוס</label>
              <select value={modalData.status || ''} onChange={e => setModalData({...modalData, status: e.target.value as TaskStatus})} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                {Object.values(TaskStatus).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center gap-4">
              <input type="checkbox" checked={modalData.hasIssue || false} onChange={e => setModalData({...modalData, hasIssue: e.target.checked})} className="w-5 h-5 text-rose-600 rounded" id="issue-check" />
              <label htmlFor="issue-check" className="text-sm font-bold text-rose-700 cursor-pointer">סמן כמשימה עם תקלה / חסימה 🚩</label>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase">הערות</label>
              <textarea value={modalData.notes || ''} onChange={e => setModalData({...modalData, notes: e.target.value})} placeholder="הערות נוספות על המשימה..." rows={2} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">תתי משימות</p>
                <p className="text-xs text-slate-500">צור תתי משימות כדי לפרק את המשימה לשלבים קטנים</p>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{editingTask ? existingSubtasks.length : draftSubtasks.length} פריטים</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">שם תת-משימה</label>
                <input
                  value={subtaskDraft.name}
                  onChange={(e) => setSubtaskDraft({ ...subtaskDraft, name: e.target.value })}
                  className="w-full border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="הזן שם"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">תחילה</label>
                <input
                  type="date"
                  value={subtaskDraft.plannedStartDate}
                  onChange={(e) => setSubtaskDraft({ ...subtaskDraft, plannedStartDate: e.target.value })}
                  className="w-full border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">סיום</label>
                <input
                  type="date"
                  value={subtaskDraft.plannedEndDate}
                  onChange={(e) => setSubtaskDraft({ ...subtaskDraft, plannedEndDate: e.target.value })}
                  className="w-full border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">סטטוס</label>
                <select
                  value={subtaskDraft.status}
                  onChange={(e) => setSubtaskDraft({ ...subtaskDraft, status: e.target.value as TaskStatus })}
                  className="w-full border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm"
                >
                  {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">שיבוץ</label>
                <select
                  value={subtaskDraft.performerContactId || ''}
                  onChange={(e) => setSubtaskDraft({ ...subtaskDraft, performerContactId: e.target.value || undefined })}
                  className="w-full border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">--- לא שובץ ---</option>
                  {contacts.filter(c => contactMatchesProject(c, modalData.projectId as string)).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddSubtask}
                className="md:col-span-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-slate-800"
              >
                + הוסף תת-משימה
              </button>
            </div>

            {(editingTask ? existingSubtasks.length > 0 : draftSubtasks.length > 0) && (
              <div className="space-y-2">
                {(editingTask ? existingSubtasks : draftSubtasks).map((st: any) => (
                  <div
                    key={st.id}
                    onDoubleClick={() => {
                      if (editingTask) {
                        setEditingSubtaskId(st.id);
                      } else {
                        setEditingDraftSubtaskId(st.id);
                      }
                    }}
                    className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center bg-slate-50 rounded-xl p-3 border border-slate-100"
                  >
                    {editingTask ? (
                      <>
                        {editingSubtaskId === st.id ? (
                          <>
                            <input
                              defaultValue={st.name}
                              onBlur={(e) => { updateTask(st.id, { name: e.target.value }); setEditingSubtaskId(null); }}
                              className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                              type="date"
                              defaultValue={st.plannedStartDate}
                              onChange={(e) => updateTask(st.id, { plannedStartDate: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            />
                            <input
                              type="date"
                              defaultValue={st.plannedEndDate}
                              onChange={(e) => updateTask(st.id, { plannedEndDate: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            />
                            <select
                              defaultValue={st.status}
                              onChange={(e) => updateTask(st.id, { status: e.target.value as TaskStatus, progress: e.target.value === TaskStatus.DONE ? 100 : st.progress })}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            >
                              {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                              defaultValue={st.performerContactId || ''}
                              onChange={(e) => updateTask(st.id, { performerContactId: e.target.value || undefined })}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            >
                              <option value="">--- לא שובץ ---</option>
                              {contacts.filter(c => contactMatchesProject(c, modalData.projectId as string)).map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => deleteTask(st.id)}
                              className="text-rose-600 text-xs font-black hover:text-rose-700"
                            >
                              מחיקה
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="md:col-span-2 text-sm font-bold text-slate-800">{st.name}</div>
                            <div className="text-xs text-slate-500">{st.plannedStartDate}</div>
                            <div className="text-xs text-slate-500">{st.plannedEndDate}</div>
                            <div className="text-xs font-bold text-slate-600">{st.status}</div>
                            <div className="text-xs text-slate-500">
                              {contacts.find(c => c.id === st.performerContactId)?.name || 'לא שובץ'}
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingSubtaskId(st.id)}
                              className="text-blue-600 text-xs font-black hover:text-blue-700"
                            >
                              עריכה
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTask(st.id)}
                              className="text-rose-600 text-xs font-black hover:text-rose-700"
                            >
                              מחיקה
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {editingDraftSubtaskId === st.id ? (
                          <>
                            <input
                              value={st.name}
                              onChange={(e) => setDraftSubtasks(prev => prev.map(d => d.id === st.id ? { ...d, name: e.target.value } : d))}
                              onBlur={() => setEditingDraftSubtaskId(null)}
                              className="md:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                              type="date"
                              value={st.plannedStartDate}
                              onChange={(e) => setDraftSubtasks(prev => prev.map(d => d.id === st.id ? { ...d, plannedStartDate: e.target.value } : d))}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            />
                            <input
                              type="date"
                              value={st.plannedEndDate}
                              onChange={(e) => setDraftSubtasks(prev => prev.map(d => d.id === st.id ? { ...d, plannedEndDate: e.target.value } : d))}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            />
                            <select
                              value={st.status}
                              onChange={(e) => setDraftSubtasks(prev => prev.map(d => d.id === st.id ? { ...d, status: e.target.value as TaskStatus } : d))}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            >
                              {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                              value={st.performerContactId || ''}
                              onChange={(e) => setDraftSubtasks(prev => prev.map(d => d.id === st.id ? { ...d, performerContactId: e.target.value || undefined } : d))}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm"
                            >
                              <option value="">--- לא שובץ ---</option>
                              {contacts.filter(c => contactMatchesProject(c, modalData.projectId as string)).map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setDraftSubtasks(prev => prev.filter(d => d.id !== st.id))}
                              className="text-rose-600 text-xs font-black hover:text-rose-700"
                            >
                              הסר
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="md:col-span-2 text-sm font-bold text-slate-800">{st.name}</div>
                            <div className="text-xs text-slate-500">{st.plannedStartDate}</div>
                            <div className="text-xs text-slate-500">{st.plannedEndDate}</div>
                            <div className="text-xs font-bold text-slate-600">{st.status}</div>
                            <div className="text-xs text-slate-500">
                              {contacts.find(c => c.id === st.performerContactId)?.name || 'לא שובץ'}
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingDraftSubtaskId(st.id)}
                              className="text-blue-600 text-xs font-black hover:text-blue-700"
                            >
                              עריכה
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraftSubtasks(prev => prev.filter(d => d.id !== st.id))}
                              className="text-rose-600 text-xs font-black hover:text-rose-700"
                            >
                              הסר
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-start gap-4 pt-6 border-t mt-6">
            <button type="submit" disabled={saving} className={`px-12 py-3.5 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 ${saving ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>שומר...</span></> : 'שמור משימה'}</button>
            <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={`px-8 py-3.5 rounded-2xl font-bold transition-all ${saving ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ביטול</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedTask ? `פרטי משימה: ${selectedTask.name}` : 'פרטי משימה'}>
        {selectedTask && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar p-1 text-right" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">שם</p><p className="font-black text-lg text-slate-900">{selectedTask.name}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">קטגוריה</p><p className="font-bold text-slate-800">{selectedTask.category}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סטטוס</p><p className={`font-bold ${selectedTask.status === TaskStatus.DONE ? 'text-green-600' : selectedTask.status === TaskStatus.IN_PROGRESS ? 'text-blue-600' : 'text-slate-600'}`}>{selectedTask.status}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">עדיפות</p><p className="font-bold text-slate-800">{selectedTask.priority}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">פרויקט</p><p className="font-bold text-slate-800">{projects.find(p => p.id === selectedTask.projectId)?.name}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">מבצע</p><p className="font-bold text-slate-800">{contacts.find(c => c.id === selectedTask.performerContactId)?.name || 'לא שובץ'}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">תחילה מתוכננת</p><p className="font-bold text-slate-800">{selectedTask.plannedStartDate}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סיום מתוכנן</p><p className="font-bold text-slate-800">{selectedTask.plannedEndDate}</p></div>
              {selectedTask.actualStartDate && (
                <div><p className="text-xs font-black text-slate-400 uppercase mb-1">תחילה בפועל</p><p className="font-bold text-slate-800">{selectedTask.actualStartDate}</p></div>
              )}
              {selectedTask.actualEndDate && (
                <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סיום בפועל</p><p className="font-bold text-slate-800">{selectedTask.actualEndDate}</p></div>
              )}
            </div>

            {selectedTask.description && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">פרטים / תיאור</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask.notes && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">הערות</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl">{selectedTask.notes}</p>
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

            {tasks.some(t => t.parentTaskId === selectedTask.id && t.itemType === TaskItemType.SUB_TASK) && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">תתי משימות</p>
                <div className="space-y-2">
                  {tasks.filter(t => t.parentTaskId === selectedTask.id && t.itemType === TaskItemType.SUB_TASK).map(t => (
                    <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">{t.name}</p>
                        <select
                          value={t.status}
                          onChange={(e) => { if (!canEditTask(t)) return; updateTask(t.id, { status: e.target.value as TaskStatus, progress: e.target.value === TaskStatus.DONE ? 100 : t.progress }); }}
                          disabled={!canEditTask(t)}
                          className={`text-xs font-black bg-white border border-slate-200 rounded-lg px-2 py-1 ${canEditTask(t) ? 'text-slate-600' : 'text-slate-400 opacity-70 cursor-not-allowed'}`}
                        >
                          {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${t.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{t.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTask.hasIssue && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-rose-400 uppercase mb-2">🚩 תקלה / חסימה</p>
                <p className="text-sm text-rose-700 bg-rose-50 p-4 rounded-2xl">{selectedTask.issueDetail || 'משימה זו סימנה כבעלת תקלה'}</p>
              </div>
            )}

            <div className="flex justify-start gap-4 pt-4 border-t">
              <button onClick={() => { setDetailModalOpen(false); handleOpenEdit(selectedTask); }} className="px-8 py-3 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-700 transition-all">ערוך משימה</button>
              <button type="button" onClick={() => setDetailModalOpen(false)} className="px-8 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">סגור</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default TasksPage;

import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Project, Task, TaskStatus } from '../types.ts';
import { useData } from '../DataContext.tsx';

type TaskFilter = 'all' | TaskStatus | 'late' | 'lateToStart' | 'lateToFinish';
type SortField = 'startDate' | 'endDate' | 'progress' | 'name';

const ProjectDetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('id');
  const { projects, tasks, users, contacts, updateTask: originalUpdateTask } = useData();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('startDate');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null);
  const [editingProgress, setEditingProgress] = useState<number>(0);

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

  const project = useMemo(() => projects.find(p => p.id === projectId), [projectId, projects]);
  
  const projectTasks = useMemo(() => {
    if (!project) return [];
    let filtered = tasks.filter(t => t.projectId === project.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Apply filter
    if (filter !== 'all') {
      if (filter === 'late') {
        // כל המשימות באיחור
        filtered = filtered.filter(t => {
          const startDate = new Date(t.plannedStartDate);
          const endDate = new Date(t.plannedEndDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          const lateToStart = t.status === TaskStatus.NOT_STARTED && startDate <= today;
          const lateToFinish = t.status !== TaskStatus.DONE && endDate <= today;
          
          return lateToStart || lateToFinish;
        });
      } else if (filter === 'lateToStart') {
        // משימות שהיו אמורות להתחיל
        filtered = filtered.filter(t => {
          const startDate = new Date(t.plannedStartDate);
          startDate.setHours(0, 0, 0, 0);
          return t.status === TaskStatus.NOT_STARTED && startDate <= today;
        });
      } else if (filter === 'lateToFinish') {
        // משימות שהיו אמורות להסתיים
        filtered = filtered.filter(t => {
          const endDate = new Date(t.plannedEndDate);
          endDate.setHours(0, 0, 0, 0);
          return t.status !== TaskStatus.DONE && endDate <= today;
        });
      } else {
        // סטטוס רגיל
        filtered = filtered.filter(t => t.status === filter);
      }
    }
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'startDate':
          return new Date(a.plannedStartDate).getTime() - new Date(b.plannedStartDate).getTime();
        case 'endDate':
          return new Date(a.plannedEndDate).getTime() - new Date(b.plannedEndDate).getTime();
        case 'progress':
          return b.progress - a.progress;
        case 'name':
          return a.name.localeCompare(b.name, 'he');
        default:
          return 0;
      }
    });
  }, [project, tasks, filter, searchQuery, sortBy]);

  const taskStats = useMemo(() => {
    const allTasks = tasks.filter(t => t.projectId === project?.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // משימות שהיו אמורות להתחיל אבל טרם החלו
    const lateToStart = allTasks.filter(t => {
      const startDate = new Date(t.plannedStartDate);
      startDate.setHours(0, 0, 0, 0);
      return t.status === TaskStatus.NOT_STARTED && startDate <= today;
    });
    
    // משימות שהיו אמורות להסתיים אבל עדיין לא הסתיימו
    const lateToFinish = allTasks.filter(t => {
      const endDate = new Date(t.plannedEndDate);
      endDate.setHours(0, 0, 0, 0);
      return t.status !== TaskStatus.DONE && endDate <= today;
    });
    
    // סה"כ משימות באיחור (ללא כפילויות)
    const allLate = Array.from(new Set([...lateToStart, ...lateToFinish]));
    
    return {
      total: allTasks.length,
      done: allTasks.filter(t => t.status === TaskStatus.DONE).length,
      inProgress: allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      blocked: allTasks.filter(t => t.status === TaskStatus.BLOCKED).length,
      notStarted: allTasks.filter(t => t.status === TaskStatus.NOT_STARTED).length,
      lateToStart: lateToStart.length,
      lateToFinish: lateToFinish.length,
      totalLate: allLate.length
    };
  }, [project, tasks]);

  const overallProgress = useMemo(() => {
    if (taskStats.total === 0) return 0;
    const totalProgress = tasks
      .filter(t => t.projectId === project?.id)
      .reduce((sum, task) => sum + task.progress, 0);
    return Math.round(totalProgress / taskStats.total);
  }, [project, tasks, taskStats.total]);

  const completionRate = useMemo(() => {
    if (taskStats.total === 0) return 0;
    return Math.round((taskStats.done / taskStats.total) * 100);
  }, [taskStats]);

  const handleStatusUpdate = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
    setEditingTaskId(null);
  };

  const handleProgressUpdate = (taskId: string, newProgress: number) => {
    updateTask(taskId, { progress: newProgress });
  };

  const startEditing = (taskId: string, status: TaskStatus, progress: number) => {
    setEditingTaskId(taskId);
    setEditingStatus(status);
    setEditingProgress(progress);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingStatus(null);
    setEditingProgress(0);
  };

  const saveEditing = (taskId: string) => {
    if (editingStatus) {
      updateTask(taskId, { status: editingStatus, progress: editingProgress });
      cancelEditing();
    }
  };

  const exportToPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('he-IL');
    const allTasks = tasks.filter(t => t.projectId === project?.id).sort((a, b) => 
      new Date(a.plannedStartDate).getTime() - new Date(b.plannedStartDate).getTime()
    );
    const projectContacts = contacts.filter(c => c.projectId === project?.id);

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${project?.name || 'פרויקט'} - דוח משימות</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 40px;
      background: white;
      direction: rtl;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header .subtitle { font-size: 14px; opacity: 0.9; margin-bottom: 20px; }
    .header .date { font-size: 12px; opacity: 0.8; }
    
    .manager-info {
      background: #eff6ff;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .manager-info h3 {
      font-size: 18px;
      color: #1e40af;
      margin-bottom: 15px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
    }
    .manager-info .contact-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .manager-info .contact-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .manager-info .contact-label {
      font-size: 11px;
      color: #64748b;
      font-weight: bold;
      text-transform: uppercase;
    }
    .manager-info .contact-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: bold;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      text-align: center;
    }
    .stat-card .number { font-size: 36px; font-weight: bold; margin-bottom: 5px; }
    .stat-card .label { font-size: 12px; color: #64748b; font-weight: bold; }
    .stat-card.total .number { color: #334155; }
    .stat-card.progress .number { color: #3b82f6; }
    .stat-card.done .number { color: #10b981; }
    .stat-card.late .number { color: #f97316; }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
    }
    .info-card h3 { 
      font-size: 16px; 
      margin-bottom: 15px; 
      color: #1e293b;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 12px; color: #64748b; font-weight: bold; }
    .info-value { font-size: 14px; color: #1e293b; font-weight: bold; }
    
    .section-title {
      font-size: 24px;
      font-weight: bold;
      margin: 30px 0 15px 0;
      color: #1e293b;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }
    thead {
      background: #f1f5f9;
    }
    th {
      padding: 12px 8px;
      text-align: right;
      font-size: 10px;
      font-weight: bold;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 12px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #f8fafc; }
    tr.late { background: #fff7ed !important; }
    
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: bold;
    }
    .status-done { background: #d1fae5; color: #065f46; }
    .status-progress { background: #dbeafe; color: #1e40af; }
    .status-blocked { background: #fee2e2; color: #991b1b; }
    .status-not-started { background: #f1f5f9; color: #475569; }
    
    .late-indicator {
      color: #f97316;
      font-size: 10px;
      font-weight: bold;
      margin-top: 3px;
    }
    
    .contacts-section {
      margin-top: 40px;
      padding: 25px;
      background: #f8fafc;
      border-radius: 15px;
      border: 2px solid #e2e8f0;
    }
    .contacts-section h3 {
      font-size: 22px;
      color: #1e293b;
      margin-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    .contacts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .contact-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
    }
    .contact-card .name {
      font-size: 16px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 5px;
    }
    .contact-card .title {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 12px;
      font-weight: bold;
    }
    .contact-card .detail {
      font-size: 13px;
      color: #475569;
      margin: 5px 0;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    
    @media print {
      body { padding: 20px; }
      .header { break-inside: avoid; }
      .manager-info { break-inside: avoid; }
      .stat-card { break-inside: avoid; }
      .contacts-section { break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${project?.name || 'פרויקט'}</h1>
    <div class="subtitle">דוח מפורט של משימות ופעילויות</div>
    <div class="date">תאריך הפקה: ${today}</div>
  </div>

  ${project?.orgManagerName ? `
  <div class="manager-info">
    <h3>👤 פרטי מנהל העמותה</h3>
    <div class="contact-grid">
      <div class="contact-item">
        <span class="contact-label">שם מלא</span>
        <span class="contact-value">${project.orgManagerName}</span>
      </div>
      <div class="contact-item">
        <span class="contact-label">טלפון</span>
        <span class="contact-value">${project.orgManagerPhone || '-'}</span>
      </div>
      <div class="contact-item">
        <span class="contact-label">דואר אלקטרוני</span>
        <span class="contact-value">${project.orgManagerEmail || '-'}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="stats">
    <div class="stat-card total">
      <div class="number">${taskStats.total}</div>
      <div class="label">סה״כ משימות</div>
    </div>
    <div class="stat-card progress">
      <div class="number">${taskStats.inProgress}</div>
      <div class="label">בתהליך</div>
    </div>
    <div class="stat-card done">
      <div class="number">${taskStats.done}</div>
      <div class="label">הושלמו</div>
    </div>
    <div class="stat-card late">
      <div class="number">${taskStats.totalLate}</div>
      <div class="label">באיחור</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <h3>פרטי פרויקט</h3>
      <div class="info-row">
        <span class="info-label">סוג פרויקט:</span>
        <span class="info-value">${project?.type || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">סטטוס:</span>
        <span class="info-value">${project?.status || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">יעד גיוס:</span>
        <span class="info-value">₪${project?.financialGoal?.toLocaleString() || 0}</span>
      </div>
      <div class="info-row">
        <span class="info-label">התקדמות כללית:</span>
        <span class="info-value">${overallProgress}%</span>
      </div>
    </div>
    
    <div class="info-card">
      <h3>תאריכים</h3>
      <div class="info-row">
        <span class="info-label">תחילה מתוכננת:</span>
        <span class="info-value">${project?.plannedStartDate || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">סיום מתוכנן:</span>
        <span class="info-value">${project?.plannedEndDate || '-'}</span>
      </div>
      ${project?.actualStartDate ? `
      <div class="info-row">
        <span class="info-label">תחילה בפועל:</span>
        <span class="info-value">${project.actualStartDate}</span>
      </div>` : ''}
      ${project?.actualEndDate ? `
      <div class="info-row">
        <span class="info-label">סיום בפועל:</span>
        <span class="info-value">${project.actualEndDate}</span>
      </div>` : ''}
    </div>
  </div>

  <h2 class="section-title">רשימת משימות (${allTasks.length})</h2>
  
  <table>
    <thead>
      <tr>
        <th style="width: 18%">שם משימה</th>
        <th style="width: 10%">קטגוריה</th>
        <th style="width: 9%">סטטוס</th>
        <th style="width: 10%">מבצע</th>
        <th style="width: 10%">תחילה מתוכננת</th>
        <th style="width: 10%">סיום מתוכנן</th>
        <th style="width: 10%">תחילה בפועל</th>
        <th style="width: 10%">סיום בפועל</th>
        <th style="width: 5%">התקדמות</th>
      </tr>
    </thead>
    <tbody>
      ${allTasks.map(task => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(task.plannedStartDate);
        const endDate = new Date(task.plannedEndDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const isLateToStart = task.status === TaskStatus.NOT_STARTED && startDate <= today;
        const isLateToFinish = task.status !== TaskStatus.DONE && endDate <= today;
        const isLate = isLateToStart || isLateToFinish;
        
        const statusClass = 
          task.status === TaskStatus.DONE ? 'status-done' :
          task.status === TaskStatus.IN_PROGRESS ? 'status-progress' :
          task.status === TaskStatus.BLOCKED ? 'status-blocked' :
          'status-not-started';
        
        const performer = contacts.find(c => c.id === task.performerContactId);
        
        return `
        <tr${isLate ? ' class="late"' : ''}>
          <td>
            <strong>${task.name}</strong>
            ${isLateToStart ? '<div class="late-indicator">⚠ היה אמור להתחיל</div>' : ''}
            ${isLateToFinish && !isLateToStart ? '<div class="late-indicator">⚠ היה אמור להסתיים</div>' : ''}
          </td>
          <td>${task.category || '-'}</td>
          <td><span class="status-badge ${statusClass}">${task.status}</span></td>
          <td>${performer?.name || 'טרם שובץ'}</td>
          <td>${task.plannedStartDate}</td>
          <td>${task.plannedEndDate}</td>
          <td>${task.actualStartDate || '-'}</td>
          <td>${task.actualEndDate || '-'}</td>
          <td><strong>${task.progress}%</strong></td>
        </tr>
      `}).join('')}
    </tbody>
  </table>

  ${projectContacts.length > 0 ? `
  <div class="contacts-section">
    <h3>👥 אנשי קשר בפרויקט (${projectContacts.length})</h3>
    <div class="contacts-grid">
      ${projectContacts.map(contact => `
        <div class="contact-card">
          <div class="name">${contact.name}</div>
          <div class="title">${contact.title || 'תפקיד לא צוין'}</div>
          <div class="detail">📞 ${contact.phone || '-'}</div>
          <div class="detail">📧 ${contact.email || '-'}</div>
          ${contact.role ? `<div class="detail">💼 ${contact.role}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>דוח זה הופק ב-${today} | ${project?.name || 'פרויקט'}</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!project) {
    return (
      <div className="text-center py-12" dir="rtl">
        <p className="text-xl font-bold text-slate-600 mb-4">פרויקט לא נמצא</p>
        <button onClick={() => navigate('/projects')} className="px-8 py-3 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-700">חזור לפרויקטים</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right pb-12" dir="rtl">
      {/* Header - Solid color with progress */}
      <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl">
        <button onClick={() => navigate('/projects')} className="mb-4 text-white/80 hover:text-white font-bold transition-colors flex items-center gap-2">
          <span>←</span> חזור לפרויקטים
        </button>
        
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-3">{project.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-block bg-white/90 text-blue-900 text-xs font-black px-4 py-2 rounded-xl shadow-sm">{project.type}</span>
              {project.color && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
                  <div style={{backgroundColor: project.color}} className="w-5 h-5 rounded-full border-2 border-white shadow-sm"></div>
                  <span className="text-sm font-bold text-white">{project.color}</span>
                </div>
              )}
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-xl">
                📊 {taskStats.total} משימות
              </span>
            </div>
          </div>
          
          <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 min-w-[160px]">
            <div className="text-5xl font-black mb-1">{overallProgress}%</div>
            <div className="text-sm text-white/90 font-bold">התקדמות</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-white/90">{taskStats.done} מתוך {taskStats.total} משימות הושלמו</span>
            <span className="font-bold text-white/90">{completionRate}% הושלם</span>
          </div>
          <div className="relative w-full h-6 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-green-400 rounded-full transition-all duration-500 flex items-center justify-end px-3"
              style={{width: `${overallProgress}%`}}
            >
              {overallProgress > 15 && <span className="text-xs font-black text-white drop-shadow">{overallProgress}%</span>}
            </div>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">✓ {taskStats.done} הושלמו</span>
            <span className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">⚡ {taskStats.inProgress} בתהליך</span>
            {taskStats.blocked > 0 && <span className="px-3 py-1 bg-rose-400/90 rounded-lg backdrop-blur-sm">⚠ {taskStats.blocked} חסומות</span>}
            <span className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">📋 {taskStats.notStarted} טרם התחילו</span>
          </div>
        </div>
      </div>

      {/* Project Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-2">סטטוס</p>
          <p className="text-xl font-black text-slate-900">{project.status}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-2">יעד גיוס</p>
          <p className="text-2xl font-black text-blue-600">₪{project.financialGoal?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-2">סה״כ עלות</p>
          <p className="text-2xl font-black text-orange-600">₪{project.projectTotalCost?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-2">סך שולם</p>
          <p className="text-2xl font-black text-green-600">₪{project.projectPaidAmount?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">תאריכים</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-1">תחילה</p>
              <p className="font-bold text-slate-800">{project.plannedStartDate}</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-1">יעד סיום</p>
              <p className="font-bold text-slate-800">{project.plannedEndDate}</p>
            </div>
            {project.actualStartDate && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase mb-1">תחילה בפועל</p>
                <p className="font-bold text-slate-800">{project.actualStartDate}</p>
              </div>
            )}
            {project.actualEndDate && (
              <div>
                <p className="text-xs font-black text-slate-400 uppercase mb-1">סיום בפועל</p>
                <p className="font-bold text-slate-800">{project.actualEndDate}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">מנהל העמותה</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-1">שם</p>
              <p className="font-bold text-slate-800">{project.orgManagerName || 'לא הוזן'}</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-1">טלפון</p>
              <p className="font-bold text-slate-800">{project.orgManagerPhone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase mb-1">אימייל</p>
              <p className="font-bold text-slate-800">{project.orgManagerEmail || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Overview - Updated with Tab Filters */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <h3 className="text-2xl font-black text-slate-900 mb-6">סטטיסטיקת משימות</h3>
        
        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-lg scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            הכל ({taskStats.total})
          </button>
          <button
            onClick={() => setFilter('late')}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
              filter === 'late'
                ? 'bg-orange-600 text-white shadow-lg scale-105'
                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            באיחור ({taskStats.totalLate})
          </button>
          <button
            onClick={() => setFilter(TaskStatus.IN_PROGRESS)}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
              filter === TaskStatus.IN_PROGRESS
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            בתהליך ({taskStats.inProgress})
          </button>
          <button
            onClick={() => setFilter(TaskStatus.DONE)}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
              filter === TaskStatus.DONE
                ? 'bg-green-600 text-white shadow-lg scale-105'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            הושלמו ({taskStats.done})
          </button>
          <button
            onClick={() => setFilter(TaskStatus.BLOCKED)}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
              filter === TaskStatus.BLOCKED
                ? 'bg-rose-600 text-white shadow-lg scale-105'
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
            }`}
          >
            תקועות ({taskStats.blocked})
          </button>
          <button
            onClick={() => setFilter(TaskStatus.NOT_STARTED)}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
              filter === TaskStatus.NOT_STARTED
                ? 'bg-slate-700 text-white shadow-lg scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            טרם התחילו ({taskStats.notStarted})
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className={`text-center p-4 rounded-2xl transition-all cursor-pointer ${
            filter === 'all' ? 'bg-slate-900 text-white ring-4 ring-slate-300' : 'bg-slate-50'
          }`} onClick={() => setFilter('all')}>
            <p className={`text-3xl font-black ${filter === 'all' ? 'text-white' : 'text-slate-900'}`}>{taskStats.total}</p>
            <p className={`text-xs font-bold ${filter === 'all' ? 'text-white/80' : 'text-slate-500'}`}>סה״כ משימות</p>
          </div>
          <div className={`text-center p-4 rounded-2xl transition-all cursor-pointer ${
            filter === 'late' ? 'bg-orange-600 text-white ring-4 ring-orange-300' : 'bg-orange-50'
          }`} onClick={() => setFilter('late')}>
            <p className={`text-3xl font-black ${filter === 'late' ? 'text-white' : 'text-orange-600'}`}>{taskStats.totalLate}</p>
            <p className={`text-xs font-bold ${filter === 'late' ? 'text-white/80' : 'text-orange-600'}`}>באיחור</p>
          </div>
          <div className={`text-center p-4 rounded-2xl transition-all cursor-pointer ${
            filter === TaskStatus.IN_PROGRESS ? 'bg-blue-600 text-white ring-4 ring-blue-300' : 'bg-blue-50'
          }`} onClick={() => setFilter(TaskStatus.IN_PROGRESS)}>
            <p className={`text-3xl font-black ${filter === TaskStatus.IN_PROGRESS ? 'text-white' : 'text-blue-600'}`}>{taskStats.inProgress}</p>
            <p className={`text-xs font-bold ${filter === TaskStatus.IN_PROGRESS ? 'text-white/80' : 'text-blue-600'}`}>בתהליך</p>
          </div>
          <div className={`text-center p-4 rounded-2xl transition-all cursor-pointer ${
            filter === TaskStatus.DONE ? 'bg-green-600 text-white ring-4 ring-green-300' : 'bg-green-50'
          }`} onClick={() => setFilter(TaskStatus.DONE)}>
            <p className={`text-3xl font-black ${filter === TaskStatus.DONE ? 'text-white' : 'text-green-600'}`}>{taskStats.done}</p>
            <p className={`text-xs font-bold ${filter === TaskStatus.DONE ? 'text-white/80' : 'text-green-600'}`}>הושלמו</p>
          </div>
          <div className={`text-center p-4 rounded-2xl transition-all cursor-pointer ${
            filter === TaskStatus.BLOCKED ? 'bg-rose-600 text-white ring-4 ring-rose-300' : 'bg-rose-50'
          }`} onClick={() => setFilter(TaskStatus.BLOCKED)}>
            <p className={`text-3xl font-black ${filter === TaskStatus.BLOCKED ? 'text-white' : 'text-rose-600'}`}>{taskStats.blocked}</p>
            <p className={`text-xs font-bold ${filter === TaskStatus.BLOCKED ? 'text-white/80' : 'text-rose-600'}`}>תקועות</p>
          </div>
          <div className={`text-center p-4 rounded-2xl transition-all cursor-pointer ${
            filter === TaskStatus.NOT_STARTED ? 'bg-slate-700 text-white ring-4 ring-slate-300' : 'bg-slate-100'
          }`} onClick={() => setFilter(TaskStatus.NOT_STARTED)}>
            <p className={`text-3xl font-black ${filter === TaskStatus.NOT_STARTED ? 'text-white' : 'text-slate-700'}`}>{taskStats.notStarted}</p>
            <p className={`text-xs font-bold ${filter === TaskStatus.NOT_STARTED ? 'text-white/80' : 'text-slate-600'}`}>טרם התחילו</p>
          </div>
        </div>
        
        {/* Late Tasks Breakdown */}
        {taskStats.totalLate > 0 && (
          <div className="mt-6 p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
            <h4 className="text-sm font-black text-orange-900 mb-3">פירוט משימות באיחור:</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFilter('lateToStart')}
                className={`p-3 rounded-lg transition-all ${
                  filter === 'lateToStart'
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white text-orange-700 hover:bg-orange-100'
                }`}
              >
                <div className="text-xl font-black">{taskStats.lateToStart}</div>
                <div className="text-xs font-bold">היו אמורות להתחיל</div>
              </button>
              <button
                onClick={() => setFilter('lateToFinish')}
                className={`p-3 rounded-lg transition-all ${
                  filter === 'lateToFinish'
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white text-orange-700 hover:bg-orange-100'
                }`}
              >
                <div className="text-xl font-black">{taskStats.lateToFinish}</div>
                <div className="text-xs font-bold">היו אמורות להסתיים</div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tasks List Sorted by Start Date */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-black text-slate-900">רשימת משימות</h3>
            <div className="flex items-center gap-3">
              {/* Export to Excel Button */}
              <button
                onClick={() => {
                  const csvContent = [
                    ['שם משימה', 'קטגוריה', 'סטטוס', 'תאריך התחלה', 'תאריך סיום', 'התקדמות'].join(','),
                    ...projectTasks.map(t => [t.name, t.category, t.status, t.plannedStartDate, t.plannedEndDate, `${t.progress}%`].join(','))
                  ].join('\n');
                  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `${project.name}_tasks.csv`;
                  link.click();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>📥</span>
                <span>ייצוא לExcel</span>
              </button>
              {/* Export to PDF Button */}
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <span>📄</span>
                <span>ייצוא לPDF</span>
              </button>
              {/* Search */}
              <input
                type="text"
                placeholder="חיפוש משימות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {/* Sort Options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="startDate">מיון: תאריך התחלה</option>
                <option value="endDate">מיון: תאריך סיום</option>
                <option value="progress">מיון: התקדמות</option>
                <option value="name">מיון: שם</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-bold">
            מציג {projectTasks.length} מתוך {taskStats.total} משימות
            {filter !== 'all' && ` (מסונן לפי: ${filter})`}
          </p>
        </div>
        
        {projectTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 text-[10px] text-slate-400 font-black border-b uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-5">משימה</th>
                  <th className="px-6 py-5 text-center">קטגוריה</th>
                  <th className="px-6 py-5 text-center">סטטוס</th>
                  <th className="px-6 py-5 text-center">תחילה מתוכננת</th>
                  <th className="px-6 py-5 text-center">סיום מתוכנן</th>
                  <th className="px-6 py-5 text-center">התקדמות</th>
                  <th className="px-6 py-5 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y">
                {projectTasks.map(task => {
                  const isEditing = editingTaskId === task.id;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const startDate = new Date(task.plannedStartDate);
                  const endDate = new Date(task.plannedEndDate);
                  startDate.setHours(0, 0, 0, 0);
                  endDate.setHours(0, 0, 0, 0);
                  
                  const isLateToStart = task.status === TaskStatus.NOT_STARTED && startDate <= today;
                  const isLateToFinish = task.status !== TaskStatus.DONE && endDate <= today;
                  const isLate = isLateToStart || isLateToFinish;
                  
                  return (
                    <tr key={task.id} className={`transition-colors ${
                      isEditing ? 'bg-blue-50' : 
                      isLate ? 'bg-orange-50/50 hover:bg-orange-100/50' : 
                      'hover:bg-slate-50/50'
                    }`}>
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-2">
                          {isLate && <span className="text-orange-500 text-lg leading-none">⚠</span>}
                          <div className="flex-1">
                            <p className="font-black text-slate-900">{task.name}</p>
                            {task.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>}
                            {isLateToStart && (
                              <p className="text-xs text-orange-600 font-bold mt-1">🕐 היה אמור להתחיל ב-{task.plannedStartDate}</p>
                            )}
                            {isLateToFinish && !isLateToStart && (
                              <p className="text-xs text-orange-600 font-bold mt-1">📅 היה אמור להסתיים ב-{task.plannedEndDate}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-bold text-slate-500">{task.category}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {isEditing ? (
                          <select
                            value={editingStatus || task.status}
                            onChange={(e) => setEditingStatus(e.target.value as TaskStatus)}
                            className="px-3 py-1 rounded-lg text-xs font-black border-2 border-blue-500 focus:outline-none"
                          >
                            <option value={TaskStatus.NOT_STARTED}>לא התחיל</option>
                            <option value={TaskStatus.IN_PROGRESS}>בתהליך</option>
                            <option value={TaskStatus.DONE}>הושלם</option>
                            <option value={TaskStatus.BLOCKED}>חסום</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black ${
                            task.status === TaskStatus.DONE ? 'bg-green-100 text-green-700' :
                            task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                            task.status === TaskStatus.BLOCKED ? 'bg-rose-100 text-rose-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {task.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-bold text-slate-700">{task.plannedStartDate}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-bold text-slate-700">{task.plannedEndDate}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={editingProgress}
                              onChange={(e) => setEditingProgress(parseInt(e.target.value))}
                              className="w-20"
                            />
                            <span className="text-xs font-bold text-blue-600 w-10">{editingProgress}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full transition-all" style={{width: `${task.progress}%`}}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 w-8">{task.progress}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => saveEditing(task.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-700 transition-colors"
                            >
                              ✓ שמור
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 bg-slate-400 text-white text-xs font-black rounded-lg hover:bg-slate-500 transition-colors"
                            >
                              ✕ ביטול
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => startEditing(task.id, task.status, task.progress)}
                              className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              ✎ ערוך
                            </button>
                            {task.status !== TaskStatus.DONE && (
                              <button
                                onClick={() => updateTask(task.id, { status: TaskStatus.DONE, progress: 100 })}
                                className="px-3 py-2 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-700 transition-colors"
                                title="סמן כהושלם"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-slate-400 font-bold italic">
              {searchQuery || filter !== 'all' ? 'לא נמצאו משימות התואמות את הסינון' : 'אין משימות בפרויקט זה'}
            </p>
          </div>
        )}
      </div>

      {/* Contacts */}
      {tasks.filter(t => t.projectId === project.id).length > 0 && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-2xl font-black text-slate-900 mb-4">אנשי קשר בפרויקט</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.filter(c => c.projectId === project.id).map(contact => (
              <div key={contact.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="font-bold text-slate-900">{contact.name}</p>
                <p className="text-xs text-slate-600 mt-1">{contact.title}</p>
                <p className="text-sm text-slate-600 mt-2">📞 {contact.phone}</p>
                <p className="text-sm text-slate-600">📧 {contact.email}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;


import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import { useData } from '../DataContext.tsx';
import { TaskStatus, ProjectStatus, TaskPriority } from '../types.ts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const ReportsPage: React.FC = () => {
  const { projects, tasks, users, meetings, organizations } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'users' | 'timeline'>('overview');
  const [selectedDateRange, setSelectedDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeProjects = projects.filter(p => !p.isDeleted && p.status !== ProjectStatus.COMPLETED);
    const completedProjects = projects.filter(p => !p.isDeleted && p.status === ProjectStatus.COMPLETED);
    
    const activeTasks = tasks.filter(t => activeProjects.some(p => p.id === t.projectId));
    const completedTasks = activeTasks.filter(t => t.status === TaskStatus.DONE);
    const inProgressTasks = activeTasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const blockedTasks = activeTasks.filter(t => t.status === TaskStatus.BLOCKED);
    const notStartedTasks = activeTasks.filter(t => t.status === TaskStatus.NOT_STARTED);
    
    const lateTasks = activeTasks.filter(t => {
      const endDate = new Date(t.plannedEndDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate <= today && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED;
    });
    
    const tasksWithIssues = activeTasks.filter(t => t.hasIssue);
    const highPriorityTasks = activeTasks.filter(t => t.priority === TaskPriority.CRITICAL || t.priority === TaskPriority.HIGH);
    
    // Project distribution by status
    const projectsByStatus = [
      { name: 'פעיל', value: activeProjects.filter(p => p.status === ProjectStatus.ACTIVE).length, color: '#3b82f6' },
      { name: 'מתוכנן', value: activeProjects.filter(p => p.status === ProjectStatus.PLANNING).length, color: '#94a3b8' },
      { name: 'בהמתנה', value: activeProjects.filter(p => p.status === ProjectStatus.ON_HOLD).length, color: '#f59e0b' },
      { name: 'הושלם', value: completedProjects.length, color: '#10b981' },
    ].filter(item => item.value > 0);
    
    // Task distribution
    const tasksByStatus = [
      { name: 'הושלמו', value: completedTasks.length, color: '#10b981' },
      { name: 'בתהליך', value: inProgressTasks.length, color: '#3b82f6' },
      { name: 'טרם התחיל', value: notStartedTasks.length, color: '#94a3b8' },
      { name: 'חסום', value: blockedTasks.length, color: '#ef4444' },
    ].filter(item => item.value > 0);
    
    // Tasks by priority
    const tasksByPriority = [
      { name: 'קריטי', value: activeTasks.filter(t => t.priority === TaskPriority.CRITICAL).length, color: '#dc2626' },
      { name: 'גבוה', value: activeTasks.filter(t => t.priority === TaskPriority.HIGH).length, color: '#f59e0b' },
      { name: 'בינוני', value: activeTasks.filter(t => t.priority === TaskPriority.MEDIUM).length, color: '#3b82f6' },
      { name: 'נמוך', value: activeTasks.filter(t => t.priority === TaskPriority.LOW).length, color: '#94a3b8' },
    ].filter(item => item.value > 0);
    
    // User workload
    const userWorkload = users.map(u => ({
      name: u.name,
      tasks: activeTasks.filter(t => t.assignees.includes(u.id) && t.status !== TaskStatus.DONE).length,
      completed: activeTasks.filter(t => t.assignees.includes(u.id) && t.status === TaskStatus.DONE).length,
      overdue: activeTasks.filter(t => {
        const endDate = new Date(t.plannedEndDate);
        endDate.setHours(0, 0, 0, 0);
        return t.assignees.includes(u.id) && endDate <= today && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED;
      }).length,
    })).filter(w => w.tasks > 0 || w.completed > 0 || w.overdue > 0);
    
    // Project progress
    const projectProgress = activeProjects.map(p => {
      const projectTasks = tasks.filter(t => t.projectId === p.id);
      const avgProgress = projectTasks.length > 0 
        ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
        : 0;
      const completedTasksCount = projectTasks.filter(t => t.status === TaskStatus.DONE).length;
      const totalTasksCount = projectTasks.length;
      
      return { 
        name: p.name, 
        progress: avgProgress, 
        completed: completedTasksCount,
        total: totalTasksCount,
        color: p.color || '#3B82F6',
        organization: p.organizationId && organizations ? organizations.find(o => o.id === p.organizationId)?.name || 'ללא' : 'ללא',
      };
    }).sort((a, b) => b.progress - a.progress);
    
    // Timeline - tasks completion over time (last 30 days)
    const timeline = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completedOnDate = tasks.filter(t => t.actualEndDate === dateStr).length;
      const startedOnDate = tasks.filter(t => t.actualStartDate === dateStr).length;
      
      timeline.push({
        date: date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }),
        completed: completedOnDate,
        started: startedOnDate,
      });
    }
    
    // Completion rate
    const totalTasksCount = activeTasks.length;
    const completionRate = totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;
    const onTimeRate = completedTasks.length > 0 
      ? Math.round((completedTasks.filter(t => {
          if (!t.actualEndDate) return false;
          return new Date(t.actualEndDate) <= new Date(t.plannedEndDate);
        }).length / completedTasks.length) * 100)
      : 0;
    
    return {
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      totalTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      blockedTasks: blockedTasks.length,
      lateTasks: lateTasks.length,
      tasksWithIssues: tasksWithIssues.length,
      highPriorityTasks: highPriorityTasks.length,
      completionRate,
      onTimeRate,
      projectsByStatus,
      tasksByStatus,
      tasksByPriority,
      userWorkload,
      projectProgress,
      timeline,
      totalMeetings: meetings?.length || 0,
    };
  }, [projects, tasks, users, organizations, meetings]);

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      {/* Header */}
      <div className="bg-white border-2 border-slate-200 p-8 rounded-3xl shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 text-slate-900">📊 דוחות וניתוח נתונים</h1>
            <p className="text-slate-600 font-semibold">תובנות מעמיקות על ביצועים, התקדמות ומגמות</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => exportToCSV(stats.projectProgress, 'project_progress')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
            >
              📥 ייצא פרויקטים
            </button>
            <button 
              onClick={() => exportToCSV(stats.userWorkload, 'user_workload')}
              className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-md"
            >
              📥 ייצא עומס עובדים
            </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 p-4 rounded-xl">
            <div className="text-3xl font-black text-green-700">{stats.completionRate}%</div>
            <div className="text-green-600 text-sm font-bold">אחוז השלמה</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 p-4 rounded-xl">
            <div className="text-3xl font-black text-blue-700">{stats.onTimeRate}%</div>
            <div className="text-blue-600 text-sm font-bold">בזמן</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 p-4 rounded-xl">
            <div className="text-3xl font-black text-purple-700">{stats.activeProjects}</div>
            <div className="text-purple-600 text-sm font-bold">פרויקטים פעילים</div>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 p-4 rounded-xl">
            <div className="text-3xl font-black text-rose-700">{stats.lateTasks}</div>
            <div className="text-rose-600 text-sm font-bold">משימות באיחור</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto bg-slate-100 p-2 rounded-2xl">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📊 סקירה כללית
        </button>
        <button 
          onClick={() => setActiveTab('projects')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'projects' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📁 ניתוח פרויקטים
        </button>
        <button 
          onClick={() => setActiveTab('tasks')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'tasks' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          ✅ ניתוח משימות
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          👥 עומס עובדים
        </button>
        <button 
          onClick={() => setActiveTab('timeline')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === 'timeline' ? 'bg-white shadow-md text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📈 ציר זמן
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects Distribution */}
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>📁</span>
              התפלגות פרויקטים לפי סטטוס
            </h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.projectsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.projectsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks Distribution */}
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>✅</span>
              התפלגות משימות לפי סטטוס
            </h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.tasksByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>🎯</span>
              משימות לפי עדיפות
            </h3>
            <div className="h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.tasksByPriority}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} name="משימות">
                    {stats.tasksByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <span>📌</span>
              מדדי ביצועים מרכזיים
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">סה"כ משימות פעילות</span>
                <span className="text-2xl font-black text-blue-600">{stats.totalTasks}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">משימות שהושלמו</span>
                <span className="text-2xl font-black text-green-600">{stats.completedTasks}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">משימות בתהליך</span>
                <span className="text-2xl font-black text-blue-600">{stats.inProgressTasks}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">משימות חסומות</span>
                <span className="text-2xl font-black text-red-600">{stats.blockedTasks}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">משימות באיחור</span>
                <span className="text-2xl font-black text-rose-600">{stats.lateTasks}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">משימות עם בעיה</span>
                <span className="text-2xl font-black text-orange-600">{stats.tasksWithIssues}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-sm font-bold text-slate-600">סה"כ פגישות</span>
                <span className="text-2xl font-black text-purple-600">{stats.totalMeetings}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>📊</span>
              התקדמות פרויקטים
            </h3>
            <div className="space-y-4">
              {stats.projectProgress.map((project, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{project.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {project.organization} • {project.completed}/{project.total} משימות הושלמו
                      </p>
                    </div>
                    <span className="text-2xl font-black text-slate-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%`, backgroundColor: project.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>✅</span>
              סטטוס משימות
            </h3>
            <div className="h-96" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.tasksByStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{fontSize: 12}} />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 12, fontWeight: 'bold'}} width={80} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {stats.tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>🎯</span>
              עדיפות משימות
            </h3>
            <div className="h-96" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.tasksByPriority}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.tasksByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
          <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
            <span>👥</span>
            עומס עבודה לפי משתמש
          </h3>
          <div className="h-96" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.userWorkload}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 'bold'}} />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="משימות פעילות" />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="הושלמו" />
                <Bar dataKey="overdue" fill="#ef4444" radius={[4, 4, 0, 0]} name="באיחור" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* User Details Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-right font-black text-slate-700">שם</th>
                  <th className="p-3 text-center font-black text-slate-700">משימות פעילות</th>
                  <th className="p-3 text-center font-black text-slate-700">הושלמו</th>
                  <th className="p-3 text-center font-black text-slate-700">באיחור</th>
                  <th className="p-3 text-center font-black text-slate-700">סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {stats.userWorkload.map((user, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{user.name}</td>
                    <td className="p-3 text-center text-blue-600 font-bold">{user.tasks}</td>
                    <td className="p-3 text-center text-green-600 font-bold">{user.completed}</td>
                    <td className="p-3 text-center text-red-600 font-bold">{user.overdue}</td>
                    <td className="p-3 text-center font-black text-slate-900">{user.tasks + user.completed + user.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200">
          <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
            <span>📈</span>
            פעילות משימות - 30 ימים אחרונים
          </h3>
          <div className="h-96" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 'bold'}} />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" name="הושלמו" />
                <Area type="monotone" dataKey="started" stroke="#3b82f6" fillOpacity={1} fill="url(#colorStarted)" name="התחילו" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;

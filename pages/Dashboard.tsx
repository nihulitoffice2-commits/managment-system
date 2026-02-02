
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProjectStatus, TaskStatus } from '../types.ts';
import { useData } from '../DataContext.tsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const DashboardPage: React.FC = () => {
  const { projects, tasks, meetings, currentUser } = useData();
  const [now, setNow] = useState(new Date());
  const todayStr = now.toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 17) return 'צהריים טובים';
    if (hour >= 17 && hour < 22) return 'ערב טוב';
    return 'לילה טוב';
  }, [now]);

  const hebrewDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(now);
    } catch {
      return now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  }, [now]);

  const timeStr = useMemo(() => now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }), [now]);
  
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => !p.isDeleted && p.status !== ProjectStatus.COMPLETED);
    const completedProjects = projects.filter(p => !p.isDeleted && p.status === ProjectStatus.COMPLETED);
    const activeTaskPool = tasks.filter(t => activeProjects.some(p => p.id === t.projectId));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lateTasks = activeTaskPool.filter(t => {
      const endDate = new Date(t.plannedEndDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate <= today && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED;
    });
    
    const doneTasks = activeTaskPool.filter(t => t.status === TaskStatus.DONE);
    const inProgressTasks = activeTaskPool.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const notStartedTasks = activeTaskPool.filter(t => t.status === TaskStatus.NOT_STARTED);
    const blockedTasks = activeTaskPool.filter(t => t.status === TaskStatus.BLOCKED);
    const issuesTasks = activeTaskPool.filter(t => t.hasIssue);
    
    const todayMeetings = (meetings || []).filter(m => m.date === todayStr);
    
    // Completion rate
    const completionRate = activeTaskPool.length > 0 
      ? Math.round((doneTasks.length / activeTaskPool.length) * 100) 
      : 0;
    
    // On-time completion rate
    const onTimeCompleted = doneTasks.filter(t => {
      if (!t.actualEndDate) return false;
      return new Date(t.actualEndDate) <= new Date(t.plannedEndDate);
    });
    const onTimeRate = doneTasks.length > 0 
      ? Math.round((onTimeCompleted.length / doneTasks.length) * 100) 
      : 0;
    
    // Project progress (top 5)
    const projectProgress = activeProjects.slice(0, 5).map(p => {
      const projectTasks = tasks.filter(t => t.projectId === p.id);
      const avgProgress = projectTasks.length > 0 
        ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
        : 0;
      return { 
        name: p.name, 
        progress: avgProgress, 
        color: p.color || '#3B82F6',
        tasksCount: projectTasks.length 
      };
    });
    
    return { 
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      totalTasks: activeTaskPool.length,
      doneTasks: doneTasks.length,
      lateTasks: lateTasks.length,
      inProgressTasks: inProgressTasks.length,
      notStartedTasks: notStartedTasks.length,
      blockedTasks: blockedTasks.length,
      issuesTasks: issuesTasks.length,
      completionRate,
      onTimeRate,
      todayMeetings,
      lateTasksList: lateTasks.slice(0, 3),
      projectProgress,
    };
  }, [projects, tasks, meetings, todayStr]);

  const taskStatusChart = useMemo(() => ([
    { name: 'הושלמו', value: stats.doneTasks, color: '#16a34a' },
    { name: 'בתהליך', value: stats.inProgressTasks, color: '#2563eb' },
    { name: 'טרם התחילו', value: stats.notStartedTasks, color: '#64748b' },
    { name: 'תקועות', value: stats.blockedTasks, color: '#e11d48' }
  ]), [stats]);

  const projectStatusChart = useMemo(() => ([
    { name: 'פעילים', value: stats.activeProjects, color: '#0ea5e9' },
    { name: 'הושלמו', value: stats.completedProjects, color: '#22c55e' }
  ]), [stats]);

  const taskVelocityChart = useMemo(() => ([
    { name: 'באיחור', value: stats.lateTasks },
    { name: 'עם בעיות', value: stats.issuesTasks },
    { name: 'סה״כ משימות', value: stats.totalTasks }
  ]), [stats]);

  return (
    <div className="space-y-8 pb-12 text-right w-full max-w-none" dir="rtl">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{greeting}, {currentUser?.name || 'משתמש'}</h1>
            <p className="text-slate-500 mt-1">{hebrewDate} · {timeStr}</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">🗂️ {stats.activeProjects} פרויקטים פעילים</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">✅ {stats.doneTasks} הושלמו</span>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-sm text-slate-500 mb-1">פרויקטים פעילים</div>
          <div className="text-3xl font-bold text-slate-900">{stats.activeProjects}</div>
          <div className="text-xs text-slate-400 mt-2">{stats.completedProjects} הושלמו</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-sm text-slate-500 mb-1">משימות בתהליך</div>
          <div className="text-3xl font-bold text-blue-600">{stats.inProgressTasks}</div>
          <div className="text-xs text-slate-400 mt-2">{stats.notStartedTasks} טרם התחילו</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-sm text-slate-500 mb-1">משימות באיחור</div>
          <div className="text-3xl font-bold text-red-600">{stats.lateTasks}</div>
          <div className="text-xs text-red-400 mt-2">דורש טיפול מיידי</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-sm text-slate-500 mb-1">פגישות היום</div>
          <div className="text-3xl font-bold text-purple-600">{stats.todayMeetings.length}</div>
          <div className="text-xs text-slate-400 mt-2">{new Date().toLocaleDateString('he-IL', { weekday: 'long' })}</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">אחוז השלמה כללי</div>
            <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-500 mt-2">{stats.doneTasks} מתוך {stats.totalTasks} משימות</div>
        </div>
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">השלמה בזמן</div>
            <div className="text-2xl font-bold text-blue-600">{stats.onTimeRate}%</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.onTimeRate}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-500 mt-2">ביצועים מצוינים</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold text-slate-700 mb-2">סטטוס משימות</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">✓ הושלמו</span>
              <span className="font-bold text-green-600">{stats.doneTasks}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">⚠ חסומות</span>
              <span className="font-bold text-red-600">{stats.blockedTasks}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">🚩 עם בעיות</span>
              <span className="font-bold text-orange-600">{stats.issuesTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black text-slate-700 mb-4">פילוח סטטוס משימות</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusChart} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {taskStatusChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v, 'כמות']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 mt-2">
            {taskStatusChart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black text-slate-700 mb-4">פרויקטים פעילים מול הושלמו</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projectStatusChart} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {projectStatusChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v, 'כמות']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-600 mt-2">
            {projectStatusChart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-black text-slate-700 mb-4">מדדי פעילות</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskVelocityChart} layout="vertical" margin={{ left: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v: any) => [v, 'כמות']} />
                <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">תמונת מצב מהירה של עומסים ותקלות.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Progress */}
        {stats.projectProgress.length > 0 && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">התקדמות פרויקטים</h3>
            <div className="space-y-4">
              {stats.projectProgress.map((project, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: project.color }}
                      ></div>
                      <span className="text-sm font-semibold text-slate-900 truncate">{project.name}</span>
                      <span className="text-xs text-slate-500">({project.tasksCount} משימות)</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${project.progress}%`, 
                        backgroundColor: project.color 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/projects" className="mt-4 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700">
              כל הפרויקטים →
            </Link>
          </div>
        )}

        {/* Focus Area */}
        {(stats.todayMeetings.length > 0 || stats.lateTasksList.length > 0) && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">מוקדי היום</h3>
            <div className="space-y-4">
              {stats.todayMeetings.length > 0 && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">פגישות היום</p>
                  <div className="space-y-2">
                    {stats.todayMeetings.slice(0, 3).map(m => {
                      const project = m.projectId ? projects.find(p => p.id === m.projectId) : null;
                      return (
                        <div key={m.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{m.title}</div>
                            {project && <div className="text-xs text-slate-500 mt-1">{project.name}</div>}
                          </div>
                          {m.time && <span className="text-xs font-bold text-slate-600">{m.time}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stats.lateTasksList.length > 0 && (
                <div>
                  <p className="text-xs font-black text-rose-500 uppercase mb-2">משימות באיחור</p>
                  <div className="space-y-2">
                    {stats.lateTasksList.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <div key={task.id} className="flex items-start justify-between p-3 bg-rose-50 rounded-xl">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{task.name}</div>
                            {project && <div className="text-xs text-slate-500 mt-1">{project.name}</div>}
                          </div>
                          <span className="text-xs font-bold text-rose-700">{task.plannedEndDate}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Link to="/tasks?view=overdue" className="mt-3 block text-center text-xs font-semibold text-rose-600 hover:text-rose-700">
                    כל המשימות באיחור →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/projects" className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">📁</div>
          <div className="font-bold text-slate-900">פרויקטים</div>
          <div className="text-sm text-slate-500 mt-1">ניהול כל הפרויקטים</div>
        </Link>
        <Link to="/tasks" className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">✓</div>
          <div className="font-bold text-slate-900">משימות</div>
          <div className="text-sm text-slate-500 mt-1">רשימת משימות מלאה</div>
        </Link>
        <Link to="/calendar" className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">📅</div>
          <div className="font-bold text-slate-900">לוח שנה</div>
          <div className="text-sm text-slate-500 mt-1">פגישות ומועדים</div>
        </Link>
      </div>
    </div>
  );
};
export default DashboardPage;

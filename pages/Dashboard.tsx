
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ProjectStatus, TaskStatus } from '../types.ts';
import { useData } from '../DataContext.tsx';

const DashboardPage: React.FC = () => {
  const { projects, tasks, meetings } = useData();
  const TODAY = new Date();
  const todayStr = TODAY.toISOString().split('T')[0];
  
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

  return (
    <div className="space-y-6 pb-12 text-right max-w-6xl" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">לוח בקרה</h1>
        <p className="text-slate-500 mt-1">{new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="text-sm text-slate-500 mb-1">פרויקטים פעילים</div>
          <div className="text-3xl font-bold text-slate-900">{stats.activeProjects}</div>
          <div className="text-xs text-slate-400 mt-2">{stats.completedProjects} הושלמו</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="text-sm text-slate-500 mb-1">משימות בתהליך</div>
          <div className="text-3xl font-bold text-blue-600">{stats.inProgressTasks}</div>
          <div className="text-xs text-slate-400 mt-2">{stats.notStartedTasks} טרם התחילו</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="text-sm text-slate-500 mb-1">משימות באיחור</div>
          <div className="text-3xl font-bold text-red-600">{stats.lateTasks}</div>
          <div className="text-xs text-red-400 mt-2">דורש טיפול מיידי</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
          <div className="text-sm text-slate-500 mb-1">פגישות היום</div>
          <div className="text-3xl font-bold text-purple-600">{stats.todayMeetings.length}</div>
          <div className="text-xs text-slate-400 mt-2">{new Date().toLocaleDateString('he-IL', { weekday: 'long' })}</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
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
        
        <div className="bg-white border border-slate-200 p-5 rounded-xl">
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

        <div className="bg-white border border-slate-200 p-5 rounded-xl">
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

      {/* Project Progress */}
      {stats.projectProgress.length > 0 && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-slate-900 mb-4">התקדמות פרויקטים מובילים</h3>
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

      {/* Today's Meetings */}
      {stats.todayMeetings.length > 0 && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-slate-900 mb-4">פגישות היום</h3>
          <div className="space-y-3">
            {stats.todayMeetings.map(m => {
              const project = m.projectId ? projects.find(p => p.id === m.projectId) : null;
              return (
                <div key={m.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{m.title}</div>
                    {project && <div className="text-sm text-slate-500 mt-1">{project.name}</div>}
                  </div>
                  {m.time && <span className="text-sm font-medium text-slate-600">{m.time}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Late Tasks - Important */}
      {stats.lateTasksList.length > 0 && (
        <div className="bg-white border border-red-200 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-red-700 mb-4">משימות באיחור - דורש טיפול</h3>
          <div className="space-y-2">
            {stats.lateTasksList.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <div key={task.id} className="flex items-start justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{task.name}</div>
                    {project && <div className="text-sm text-slate-500 mt-1">{project.name}</div>}
                  </div>
                  <span className="text-sm font-medium text-red-700">{task.plannedEndDate}</span>
                </div>
              );
            })}
          </div>
          <Link to="/tasks?view=overdue" className="mt-4 block text-center text-sm font-semibold text-red-600 hover:text-red-700">
            כל המשימות באיחור →
          </Link>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/projects" className="bg-white border border-slate-200 p-5 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">📁</div>
          <div className="font-bold text-slate-900">פרויקטים</div>
          <div className="text-sm text-slate-500 mt-1">ניהול כל הפרויקטים</div>
        </Link>
        <Link to="/tasks" className="bg-white border border-slate-200 p-5 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">✓</div>
          <div className="font-bold text-slate-900">משימות</div>
          <div className="text-sm text-slate-500 mt-1">רשימת משימות מלאה</div>
        </Link>
        <Link to="/calendar" className="bg-white border border-slate-200 p-5 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
          <div className="text-2xl mb-2">📅</div>
          <div className="font-bold text-slate-900">לוח שנה</div>
          <div className="text-sm text-slate-500 mt-1">פגישות ומועדים</div>
        </Link>
      </div>
    </div>
  );
};
export default DashboardPage;

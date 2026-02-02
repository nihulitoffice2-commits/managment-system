
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { UserRole, User } from './types.ts';
import { DataProvider, useData } from './DataContext.tsx';
import { ICONS } from './constants.tsx';
import logoUrl from './static/logo.jpg';
import stampUrl from './static/stampt.jpg';

// Pages
import DashboardPage from './pages/Dashboard.tsx';
import ProjectsPage from './pages/Projects.tsx';
import ProjectDetailPage from './pages/ProjectDetail.tsx';
import TasksPage from './pages/Tasks.tsx';
import KanbanPage from './pages/Kanban.tsx';
import CalendarPage from './pages/Calendar.tsx';
import GanttPage from './pages/Gantt.tsx';
import ReportsPage from './pages/Reports.tsx';
import PaymentsPage from './pages/Payments.tsx';
import UsersManagementPage from './pages/UsersManagement.tsx';
import ContactsPage from './pages/Contacts.tsx';
import SettingsPage from './pages/Settings.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const sessionStr = localStorage.getItem('nihulit_session');
    const userStr = localStorage.getItem('nihulit_user');

    if (sessionStr && userStr) {
      try {
        const session = JSON.parse(sessionStr);
        const storedUser = JSON.parse(userStr);

        // Check if session is still valid (30 days)
        if (session.expiryTime > new Date().getTime()) {
          setUser(storedUser);
        } else {
          // Session expired, clear storage
          localStorage.removeItem('nihulit_session');
          localStorage.removeItem('nihulit_user');
        }
      } catch (error) {
        console.error('Error parsing session:', error);
      }
    }

    setLoading(false);
  }, []);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4" dir="rtl">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-slate-500 animate-pulse">טוען מערכת שמעון ראב...</p>
    </div>
  );

  if (!user) {
    return (
      <DataProvider currentUser={null}>
        <HashRouter>
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
            <LoginModal onLogin={setUser} />
          </div>
        </HashRouter>
      </DataProvider>
    );
  }

  return (
    <DataProvider currentUser={user}>
      <HashRouter>
        <AppContent user={user} onLogout={() => setUser(null)} />
      </HashRouter>
    </DataProvider>
  );
};

const AppContent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col border-l border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
            <img src={logoUrl} alt="שמעון ראב" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <span className="text-base font-black tracking-tight block">שמעון ראב</span>
            <span className="text-[10px] text-slate-400 block">ייעוץ וליווי תהליכי התרמה</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <SidebarLink to="/" icon={ICONS.Dashboard} label="דשבורד" />
          <SidebarLink to="/projects" icon={ICONS.Campaigns} label="פרויקטים" />
          <SidebarLink to="/tasks" icon={ICONS.Tasks} label="משימות" />
          <SidebarLink to="/kanban" icon={ICONS.Kanban} label="לוח קנבן" />
          <SidebarLink to="/calendar" icon={ICONS.Calendar} label="לוח שנה" />
          <SidebarLink to="/gantt" icon={ICONS.Gantt} label="גאנט ניהולי" />
          <div className="h-4"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase px-4 mb-2 tracking-widest">פיננסים וניהול</p>
          <SidebarLink to="/payments" icon={ICONS.Payments} label="כספים ותשלומים" />
          <SidebarLink to="/reports" icon={ICONS.Reports} label="דוחות ונתונים" />
          <SidebarLink to="/contacts" icon={ICONS.Users} label="אנשי קשר" />
          <SidebarLink to="/users" icon={ICONS.Users} label="ניהול משתמשים" />
          <SidebarLink to="/settings" icon={ICONS.Settings} label="הגדרות" />
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl mb-4">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center font-bold text-slate-300">
                {user?.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate">{user?.name}</p>
                <p className="text-[9px] text-slate-500 uppercase">{user?.role}</p>
              </div>
           </div>
           <button onClick={onLogout} className="w-full py-3 rounded-xl text-xs font-black text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all flex items-center justify-center gap-2">
             📤 התנתקות
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="font-black text-slate-800 text-lg">
            <Routes>
              <Route path="/" element="מרכז בקרה" />
              <Route path="/projects" element="ניהול פרויקטים" />
              <Route path="/tasks" element="משימות ותהליכים" />
              <Route path="/kanban" element="לוח קנבן" />
              <Route path="/calendar" element="לוח שנה" />
              <Route path="/gantt" element="גאנט פרויקטים" />
              <Route path="/payments" element="ניהול פיננסי" />
              <Route path="/reports" element="דוחות וניתוח נתונים" />
              <Route path="/contacts" element="ספר כתובות" />
              <Route path="/users" element="ניהול משתמשים" />
              <Route path="/settings" element="הגדרות מערכת" />
            </Routes>
          </h2>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/project" element={<ProjectDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/gantt" element={<GanttPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/users" element={<UsersManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const SidebarLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
};

const LoginModal: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const { login } = useData();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingState(true);

    try {
      const user = await login(emailInput, passwordInput);
      if (user) {
        onLogin(user);
      } else {
        setError('אימייל או סיסמה שגויים, או המשתמש אינו פעיל');
      }
    } catch (err) {
      setError('שגיאה בעת ההתחברות. אנא נסה שנית.');
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      {/* Header Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-sm mb-5 ring-1 ring-slate-200/70">
          <img src={logoUrl} alt="שמעון ראב" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">שמעון ראב | ייעוץ וליווי תהליכי התרמה</h1>
        <p className="text-sm md:text-base text-slate-500 font-medium">מערכת לניהול תהליכים, קמפיינים וקשרים</p>
      </div>

      {/* Form Card */}
      <div className="relative bg-white rounded-[2rem] border border-slate-200/70 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.5)] p-7 md:p-10 space-y-7 overflow-hidden">
        <img
          src={stampUrl}
          alt="חותמת שמעון ראב"
          className="pointer-events-none absolute bottom-6 left-1/2 w-44 h-44 -translate-x-1/2 opacity-90 rotate-0 object-contain"
        />
        
        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-2">ברוכים הבאים בחזרה</h2>
          <p className="text-slate-500 text-sm md:text-base">היכנס לחשבונך כדי לנהל תהליכי התרמה, פרויקטים וקשרים</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">אימייל</label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none transition-all duration-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">סיסמה</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none transition-all duration-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-in fade-in">
              <p className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loadingState}
            className="w-full bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-sm hover:bg-blue-700 disabled:bg-blue-400 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loadingState ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <span>התחבר</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Info Section */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="space-y-3">
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">מידע חשוב</p>
            <div className="space-y-2 text-[13px] text-slate-600 leading-relaxed">
              <p>✓ רק משתמשים מורשים יכולים להתחבר למערכת</p>
              <p>✓ ההתחברות תהיה בתוקף <span className="font-black text-blue-600">30 יום</span> עד להתנתקות</p>
              <p>✓ לשאלות ועזרה, צור קשר עם מנהל המערכת</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-sm text-slate-500 font-medium">
          כל הזכויות שמורות © 2026 שמעון ראב
        </p>
      </div>
    </div>
  );
};

export default App;

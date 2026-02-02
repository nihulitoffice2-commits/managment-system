
import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types.ts';
import Modal from '../components/Modal.tsx';
import { useData } from '../DataContext.tsx';
import { ICONS } from '../constants.tsx';

const UsersManagementPage: React.FC = () => {
  const { users, projects, addUser, updateUser, deleteUser, currentUser } = useData();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const isSysAdmin = currentUser?.role === UserRole.SYS_ADMIN;
  const isPmAdmin = currentUser?.role === UserRole.PM_ADMIN;
  const canManageUsers = isSysAdmin || isPmAdmin;
  const canDeleteUsers = isSysAdmin;
  const pmProjectIds = currentUser?.accessibleProjects || [];

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (searchTerm && !u.name.toLowerCase().includes(searchTerm.toLowerCase()) && !u.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus === 'active' && !u.active) return false;
      if (filterStatus === 'inactive' && u.active) return false;
      return true;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.active).length,
      admins: users.filter(u => u.role === UserRole.SYS_ADMIN || u.role === UserRole.PM_ADMIN).length,
      workers: users.filter(u => u.role === UserRole.WORKER).length
    };
  }, [users]);

  const handleOpenNew = () => {
    if (!canManageUsers) return;
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    if (!canManageUsers) return;
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canDeleteUsers) return;
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      deleteUser(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const accessibleProjects = Array.from(formData.getAll('accessibleProjects') as string[]);
    const limitedAccessibleProjects = isPmAdmin
      ? accessibleProjects.filter(id => pmProjectIds.includes(id))
      : accessibleProjects;
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('passwordConfirm') as string;
    
    // Validation
    if (!editingUser && !password) {
      alert('סיסמה היא חובה למשתמש חדש');
      return;
    }

    if (password && passwordConfirm && password !== passwordConfirm) {
      alert('הסיסמאות לא תואמות');
      return;
    }

    if (password && password.length < 6) {
      alert('סיסמה חייבת להיות לפחות 6 תווים');
      return;
    }

    const data: Partial<User> = {
      name: formData.get('name') as string,
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as UserRole,
      active: formData.get('active') === 'true',
      accessibleProjects: limitedAccessibleProjects,
    };

    // Store password exactly as entered
    if (password) {
      data.password = password;
    }

    if (editingUser) {
      updateUser(editingUser.id, data);
    } else {
      const newUser: User = {
        id: '',
        organizationId: users[0]?.organizationId || 'org_nihulit',
        ...data as any
      };
      addUser(newUser);
    }
    setModalOpen(false);
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.SYS_ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case UserRole.PM_ADMIN: return 'bg-blue-100 text-blue-700 border-blue-200';
      case UserRole.WORKER: return 'bg-slate-100 text-slate-600 border-slate-200';
      case UserRole.VIEWER: return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.SYS_ADMIN: return 'מנהל מערכת';
      case UserRole.PM_ADMIN: return 'מנהל פרויקטים';
      case UserRole.WORKER: return 'עובד';
      case UserRole.VIEWER: return 'צופה';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ניהול משתמשים והרשאות</h1>
          <p className="text-slate-500 font-medium">אימות, הרשאות וניהול גישה לפרויקטים</p>
        </div>
        {canManageUsers && (
          <button onClick={handleOpenNew} className="bg-blue-600 text-white px-8 py-2.5 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">+ משתמש חדש</button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">סה״כ משתמשים</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">פעילים</p>
          <p className="text-3xl font-black text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">מנהלים</p>
          <p className="text-3xl font-black text-blue-600">{stats.admins}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-black text-slate-400 uppercase mb-1">עובדים</p>
          <p className="text-3xl font-black text-purple-600">{stats.workers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block">חיפוש</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="חיפוש לפי שם או אימייל..."
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium placeholder-slate-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block">תפקיד</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium">
              <option value="all">הכל</option>
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{getRoleLabel(role as UserRole)}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block">סטטוס</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium">
              <option value="all">הכל</option>
              <option value="active">פעילים בלבד</option>
              <option value="inactive">מנוטרלים בלבד</option>
            </select>
          </div>

          {/* Clear */}
          <div className="flex items-end">
            <button 
              onClick={() => { setSearchTerm(''); setFilterRole('all'); setFilterStatus('all'); }}
              className="w-full bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              נקה סינונים
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gradient-to-r from-slate-50 to-white text-[10px] text-slate-400 font-black uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">שם מלא</th>
                <th className="px-6 py-4">אימייל</th>
                <th className="px-6 py-4 text-center">פרויקטים</th>
                <th className="px-6 py-4">תפקיד</th>
                <th className="px-6 py-4 text-center">סטטוס</th>
                <th className="px-6 py-4 text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    לא נמצאו משתמשים תואמים
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700 text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{u.email}</td>
                    <td className="px-6 py-4 text-center">
                      {u.role === UserRole.SYS_ADMIN ? (
                        <span className="inline-block bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-lg border border-purple-100">כל הפרויקטים</span>
                      ) : (
                        <span className="inline-block bg-slate-50 text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">
                          {(u.accessibleProjects || []).length} / {projects.length}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${u.active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                        <span className="text-xs font-bold text-slate-600">{u.active ? 'פעיל' : 'מנוטרל'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManageUsers && (
                          <>
                            <button onClick={() => handleOpenEdit(u)} title="ערוך משתמש" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white rounded-lg border border-slate-200 transition-colors">
                              ✏️
                            </button>
                            {canDeleteUsers && currentUser?.id !== u.id && (
                              <button onClick={() => handleDelete(u.id)} title="מחק משתמש" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-colors">
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'עריכת משתמש' : 'משתמש חדש'}>
          <form onSubmit={handleSubmit} className="space-y-6 text-right max-h-[80vh] overflow-y-auto custom-scrollbar p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">שם מלא *</label>
                <input name="name" required defaultValue={editingUser?.name} type="text" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">שם משתמש (unique)</label>
                <input name="username" defaultValue={editingUser?.username} type="text" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">אימייל Google *</label>
                <input name="email" required defaultValue={editingUser?.email} type="email" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" />
              </div>
              
              {!editingUser && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סיסמה *</label>
                    <input name="password" type="password" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="לפחות 6 תווים" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">אישור סיסמה *</label>
                    <input name="passwordConfirm" type="password" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="אישור סיסמה" />
                  </div>
                </>
              )}

              {editingUser && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סיסמה חדשה (לעדכון בלבד)</label>
                    <input name="password" type="password" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="השאר ריק אם לא ברצונך לשנות" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">אישור סיסמה חדשה</label>
                    <input name="passwordConfirm" type="password" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" placeholder="אישור סיסמה חדשה" />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">תפקיד *</label>
                <select name="role" required defaultValue={editingUser?.role || UserRole.WORKER} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500">
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{getRoleLabel(role as UserRole)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סטטוס</label>
                <select name="active" defaultValue={editingUser?.active ? 'true' : 'false'} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="true">פעיל</option>
                  <option value="false">מנוטרל</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-3 pt-6 border-t">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">פרויקטים מורשים לצפייה ועריכה</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {projects.filter(p => !p.isDeleted && (!isPmAdmin || pmProjectIds.includes(p.id))).map(p => (
                  <label key={p.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="accessibleProjects" 
                      value={p.id} 
                      defaultChecked={editingUser?.accessibleProjects?.includes(p.id)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer" 
                    />
                    <span className="text-xs font-bold text-slate-700 flex-1">{p.name}</span>
                    {p.color && <div style={{backgroundColor: p.color}} className="w-3 h-3 rounded-full border border-slate-300"></div>}
                  </label>
                ))}
                {projects.filter(p => !p.isDeleted).length === 0 && <p className="text-xs text-slate-400 italic col-span-2">אין פרויקטים להצגה</p>}
              </div>
              <p className="text-[10px] text-slate-500 font-medium italic">💡 מנהל מערכת (SYS_ADMIN) רואה אוטומטית את כל הפרויקטים.</p>
            </div>

            <div className="flex justify-start gap-4 pt-6 border-t">
              <button type="submit" className="bg-blue-600 text-white px-12 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">שמור משתמש</button>
              <button type="button" onClick={() => setModalOpen(false)} className="bg-slate-100 text-slate-600 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-200">ביטול</button>
            </div>
          </form>
        </Modal>
      </div>
  );
};

export default UsersManagementPage;

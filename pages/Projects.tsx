
import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectType, Contact } from '../types.ts';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal.tsx';
// Fix: Correct import path for useData hook
import { useData } from '../DataContext.tsx';
import { ICONS } from '../constants.tsx';

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, tasks, users, contacts, loading, saving, addProject, updateProject, deleteProject, addContact, updateContact, deleteContact } = useData();
  const [filter, setFilter] = useState('');
  const [viewTab, setViewTab] = useState<'active' | 'completed' | 'all'>('active');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [tempProjectId, setTempProjectId] = useState<string | null>(null);
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [addContactModalOpen, setAddContactModalOpen] = useState(false);
  const [addContactFormData, setAddContactFormData] = useState({ name: '', phone: '', email: '', title: '' });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);
  
  const getStatusColorClasses = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'bg-blue-100 text-blue-700';
      case ProjectStatus.ACTIVE:
        return 'bg-green-100 text-green-700';
      case ProjectStatus.ON_HOLD:
        return 'bg-yellow-100 text-yellow-700';
      case ProjectStatus.COMPLETED:
        return 'bg-slate-200 text-slate-600';
      case ProjectStatus.CANCELLED:
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };
  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (p.isDeleted) return false;
      const matchesSearch = p.name.toLowerCase().includes(filter.toLowerCase());
      const matchesTab = viewTab === 'all' ? true : viewTab === 'active' ? p.status !== ProjectStatus.COMPLETED && p.status !== ProjectStatus.CANCELLED : viewTab === 'completed' ? p.status === ProjectStatus.COMPLETED : true;
      return matchesSearch && matchesTab;
    });
  }, [projects, filter, viewTab]);
  const handleOpenNew = () => { setEditingProject(null); setModalOpen(true); };
  // when opening new project modal, prepare a temporary id for contacts
  const handleOpenNewWithTemp = () => { setEditingProject(null); const tmp = `tmp-${Date.now()}`; setTempProjectId(tmp); setModalOpen(true); };
  const handleOpenEdit = (project: Project) => { setEditingProject(project); setModalOpen(true); };
  const handleDelete = (id: string) => { if (confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) deleteProject(id); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data: Partial<Project> = {
      name: formData.get('name') as string,
      managerId: formData.get('managerId') as string,
      status: formData.get('status') as ProjectStatus,
      type: formData.get('type') as ProjectType,
      plannedStartDate: formData.get('plannedStartDate') as string,
      plannedEndDate: formData.get('plannedEndDate') as string,
      financialGoal: Number(formData.get('financialGoal')),
      projectTotalCost: Number(formData.get('projectTotalCost')),
      projectPaidAmount: Number(formData.get('projectPaidAmount')),
      color: formData.get('color') as string,
      orgManagerName: formData.get('orgManagerName') as string,
      orgManagerPhone: formData.get('orgManagerPhone') as string,
      orgManagerEmail: formData.get('orgManagerEmail') as string,
      projectNotes: formData.get('projectNotes') as string,
    };
    if (editingProject) updateProject(editingProject.id, data);
    else {
      // אל תוצר ID - תן ל Firebase ליצור אותו. השתמש ב-temp id כדי לקשר אנשי קשר שנוצרו לפני שמירה
      const idToUse = tempProjectId || `tmp-${Date.now()}`;
      const newProj: Project = { id: idToUse, organizationId: 'org_client_1', plannedBudget: 0, actualBudget: 0, isDeleted: false, ...data as any };
      const createdId = await addProject(newProj) as string | undefined;
      // אם היו אנשי קשר שנוצרו עם temp id, עדכן אותם ל-id האמיתי
      if (createdId && tempProjectId) {
        contacts.filter(c => c.projectId === tempProjectId).forEach(c => updateContact(c.id, { projectId: createdId }));
      }
      setTempProjectId(null);
    }
    setModalOpen(false);
  };
  const projectContacts = useMemo(() => {
    const currentId = editingProject ? editingProject.id : tempProjectId;
    return currentId ? contacts.filter(c => c.projectId === currentId) : [];
  }, [contacts, editingProject, tempProjectId]);
  return (
    <div className="space-y-6 text-right" dir="rtl">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-600 font-bold">טוען נתונים...</p>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">ניהול פרויקטים</h1><p className="text-slate-500 font-medium">מקור אמת מרכזי לכל הפרויקטים והקמפיינים</p></div>
        <button onClick={handleOpenNewWithTemp} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">+ הקמת פרויקט חדש</button>
      </div>
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-fit">
          {['active', 'completed', 'all'].map(tab => (
            <button key={tab} onClick={() => setViewTab(tab as any)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab === 'active' ? 'פעילים' : tab === 'completed' ? 'הושלמו' : 'הכל'}
            </button>
          ))}
        </div>
        <input type="text" placeholder="חפש פרויקט..." className="flex-1 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.map((project) => (
          <div key={project.id} onClick={() => navigate(`/project?id=${project.id}`)} className={`bg-white rounded-[2rem] border shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group cursor-pointer ${project.status === ProjectStatus.COMPLETED ? 'border-slate-100 opacity-80' : 'border-slate-200'}`}>
            <div className="p-8 flex-1 cursor-pointer" onClick={() => { setSelectedProjectDetail(project); setDetailModalOpen(true); }}>
              <div className="flex justify-between items-start mb-6">
                <div className="relative">
                  {statusEditId === project.id ? (
                    <select autoFocus onBlur={() => setStatusEditId(null)} defaultValue={project.status} onChange={(e) => { updateProject(project.id, { status: e.target.value as ProjectStatus }); setStatusEditId(null); }} className="text-[10px] font-black px-3 py-1.5 rounded-xl uppercase bg-white border border-blue-300">
                      {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <button onClick={() => setStatusEditId(project.id)} className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase ${getStatusColorClasses(project.status)}`}>{project.status}</button>
                  )}
                </div>
                <div className="flex gap-2"><button onClick={() => handleOpenEdit(project)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                  <button onClick={() => handleDelete(project.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{project.name}</h3><p className="text-sm font-bold text-slate-400 mb-4">{project.type}</p>
              <div className="space-y-1 mb-6 border-t pt-4"><p className="text-[10px] font-black text-slate-400 uppercase">מנהל העמותה</p><p className="text-xs font-bold text-slate-800">{project.orgManagerName || 'לא הוזן'}</p><p className="text-[10px] text-slate-500">{project.orgManagerPhone} | {project.orgManagerEmail}</p></div>
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-2xl"><div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">יעד גיוס</p><p className="text-sm font-black text-slate-900">₪{project.financialGoal?.toLocaleString() || 0}</p></div>
                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">סה״כ עלות</p><p className="text-sm font-black text-blue-600">₪{project.projectTotalCost?.toLocaleString() || 0}</p></div></div>
            </div>
            <div className="px-8 py-4 bg-slate-50 border-t flex justify-between items-center text-[10px] font-bold text-slate-400"><span>מנהל פנימי: {users.find(u => u.id === project.managerId)?.name}</span><span>{project.plannedEndDate}</span></div>
          </div>
        ))}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingProject ? 'עריכת פרויקט' : 'הקמת פרויקט חדש'}><div className="space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar p-1">
        <form onSubmit={handleSubmit} id="project-form" className="space-y-6 text-right" dir="rtl"><h3 className="text-sm font-black text-blue-600 border-b pb-2 mb-4">פרטי פרויקט כלליים</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5"><div className="md:col-span-2 space-y-1"><label className="text-xs font-black text-slate-400 uppercase">שם הפרויקט *</label><input name="name" required defaultValue={editingProject?.name} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">צבע פרויקט</label><div className="flex items-center gap-2"><input type="color" name="color" defaultValue={editingProject?.color || '#3B82F6'} className="w-16 h-12 rounded-xl cursor-pointer" /><span className="text-xs text-slate-500">בחר צבע לפרויקט</span></div></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">מנהל פרויקט פנימי *</label><select name="managerId" required defaultValue={editingProject?.managerId} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">סוג פרויקט *</label><select name="type" required defaultValue={editingProject?.type} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">{Object.values(ProjectType).map(v => <option key={v} value={v}>{v}</option>)}</select></div></div>
          <h3 className="text-sm font-black text-blue-600 border-b pb-2 mb-4 mt-8">פרטי מנהל העמותה</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5"><div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">שם מנהל העמותה</label><input name="orgManagerName" defaultValue={editingProject?.orgManagerName} className="w-full border-slate-200 bg-slate-50 rounded-xl px-4 py-2" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">טלפון</label><input name="orgManagerPhone" defaultValue={editingProject?.orgManagerPhone} className="w-full border-slate-200 bg-slate-50 rounded-xl px-4 py-2" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">אימייל</label><input name="orgManagerEmail" defaultValue={editingProject?.orgManagerEmail} className="w-full border-slate-200 bg-slate-50 rounded-xl px-4 py-2" /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8"><div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">תאריך התחלה</label><input name="plannedStartDate" type="date" defaultValue={editingProject?.plannedStartDate} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">תאריך יעד</label><input name="plannedEndDate" type="date" defaultValue={editingProject?.plannedEndDate} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" /></div>
            <div className="md:col-span-2 space-y-1"><label className="text-xs font-black text-slate-400 uppercase">סטטוס פרויקט</label><select name="status" defaultValue={editingProject?.status} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">{Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div></form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">יעד גיוס (₪)</label><input name="financialGoal" type="number" defaultValue={editingProject?.financialGoal as any} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">סה״כ עלות (₪)</label><input name="projectTotalCost" type="number" defaultValue={editingProject?.projectTotalCost as any} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" /></div>
          </div>
        {editingProject && (
          <div className="mt-10 border-t pt-8"><div className="flex justify-between items-center mb-4"><h3 className="text-sm font-black text-blue-600">אנשי קשר בעמותה</h3><button onClick={() => { setAddContactFormData({ name: '', phone: '', email: '', title: '' }); setAddContactModalOpen(true); }} className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ הוסף איש קשר</button></div>
            <div className="grid grid-cols-1 gap-3">{projectContacts.map(c => (
              <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group"><div><p className="font-bold text-slate-800">{c.name} <span className="text-[10px] text-slate-400 font-normal">({c.title})</span></p><p className="text-[10px] text-slate-500">{c.phone} | {c.email}</p></div>
                <div className="flex gap-2"><button onClick={() => { const newName = prompt('שם חדש:', c.name); if (newName) updateContact(c.id, { name: newName }); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-lg border border-slate-100"><ICONS.Campaigns className="w-4 h-4" /></button>
                  <button onClick={() => deleteContact(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white rounded-lg border border-slate-100"><ICONS.Alert className="w-4 h-4" /></button></div></div>
            ))}{projectContacts.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">טרם נוספו אנשי קשר לפרויקט</p>}</div></div>
        )}
        {/* Allow adding contacts when creating a new project too */}
        {!editingProject && (
          <div className="mt-10 border-t pt-8"><div className="flex justify-between items-center mb-4"><h3 className="text-sm font-black text-blue-600">אנשי קשר בעמותה</h3><button onClick={() => { setAddContactFormData({ name: '', phone: '', email: '', title: '' }); setAddContactModalOpen(true); }} className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ הוסף איש קשר</button></div>
            <div className="grid grid-cols-1 gap-3">{projectContacts.map(c => (
              <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group"><div><p className="font-bold text-slate-800">{c.name} <span className="text-[10px] text-slate-400 font-normal">({c.title})</span></p><p className="text-[10px] text-slate-500">{c.phone} | {c.email}</p></div>
                <div className="flex gap-2"><button onClick={() => { const newName = prompt('שם חדש:', c.name); if (newName) updateContact(c.id, { name: newName }); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-lg border border-slate-100"><ICONS.Campaigns className="w-4 h-4" /></button>
                  <button onClick={() => deleteContact(c.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white rounded-lg border border-slate-100"><ICONS.Alert className="w-4 h-4" /></button></div></div>
            ))}{projectContacts.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">טרם נוספו אנשי קשר לפרויקט</p>}</div></div>
        )}
        <div className="flex justify-start gap-4 pt-8 mt-8 border-t"><button type="submit" form="project-form" disabled={saving} className={`px-12 py-3.5 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2 ${saving ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>שומר...</span></> : 'שמור פרויקט'}</button><button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={`px-8 py-3.5 rounded-2xl font-bold ${saving ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>ביטול</button></div></div></Modal>
      <Modal isOpen={addContactModalOpen} onClose={() => setAddContactModalOpen(false)} title="הוסף איש קשר חדש">
        <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar p-1" dir="rtl">
          <div className="space-y-4">
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">שם איש הקשר *</label><input type="text" placeholder="הזן שם" value={addContactFormData.name} onChange={(e) => setAddContactFormData({ ...addContactFormData, name: e.target.value })} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">טלפון</label><input type="tel" placeholder="הזן טלפון" value={addContactFormData.phone} onChange={(e) => setAddContactFormData({ ...addContactFormData, phone: e.target.value })} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">אימייל</label><input type="email" placeholder="הזן אימייל" value={addContactFormData.email} onChange={(e) => setAddContactFormData({ ...addContactFormData, email: e.target.value })} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase">תפקיד</label><input type="text" placeholder="הזן תפקיד" value={addContactFormData.title} onChange={(e) => setAddContactFormData({ ...addContactFormData, title: e.target.value })} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="flex justify-start gap-4 pt-6 border-t">
            <button onClick={() => { if (addContactFormData.name.trim()) { const projectId = editingProject?.id || tempProjectId || `tmp-${Date.now()}`; addContact({ id: `c-${Date.now()}`, projectId, organizationId: editingProject?.organizationId || 'org_client_1', name: addContactFormData.name, phone: addContactFormData.phone, email: addContactFormData.email, title: addContactFormData.title, }); setAddContactFormData({ name: '', phone: '', email: '', title: '' }); setAddContactModalOpen(false); } }} className="px-8 py-3.5 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition-all">הוסף איש קשר</button>
            <button type="button" onClick={() => setAddContactModalOpen(false)} className="px-8 py-3.5 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">ביטול</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedProjectDetail ? `פרטי פרויקט: ${selectedProjectDetail.name}` : 'פרטי פרויקט'}>
        {selectedProjectDetail && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar p-1 text-right" dir="rtl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2"><p className="text-xs font-black text-slate-400 uppercase mb-1">שם הפרויקט</p><p className="font-black text-xl text-slate-900">{selectedProjectDetail.name}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סטטוס</p><p className={`font-bold ${getStatusColorClasses(selectedProjectDetail.status)}`}>{selectedProjectDetail.status}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סוג</p><p className="font-bold text-slate-800">{selectedProjectDetail.type}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">תאריך התחלה</p><p className="font-bold text-slate-800">{selectedProjectDetail.plannedStartDate}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">תאריך יעד</p><p className="font-bold text-slate-800">{selectedProjectDetail.plannedEndDate}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">יעד גיוס</p><p className="font-black text-lg text-slate-900">₪{selectedProjectDetail.financialGoal?.toLocaleString() || 0}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סה״כ עלות</p><p className="font-black text-lg text-blue-600">₪{selectedProjectDetail.projectTotalCost?.toLocaleString() || 0}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">סך שולם</p><p className="font-bold text-slate-800">₪{selectedProjectDetail.projectPaidAmount?.toLocaleString() || 0}</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-1">מנהל פנימי</p><p className="font-bold text-slate-800">{users.find(u => u.id === selectedProjectDetail.managerId)?.name}</p></div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-black text-slate-400 uppercase mb-2">מנהל העמותה</p>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="font-bold text-slate-900">{selectedProjectDetail.orgManagerName || 'לא הוזן'}</p>
                <p className="text-sm text-slate-700">{selectedProjectDetail.orgManagerPhone}</p>
                <p className="text-sm text-slate-700">{selectedProjectDetail.orgManagerEmail}</p>
              </div>
            </div>

            {selectedProjectDetail.projectNotes && (
              <div className="border-t pt-4">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">הערות</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl">{selectedProjectDetail.projectNotes}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs font-black text-slate-400 uppercase mb-2">משימות בפרויקט</p>
              {tasks.filter(t => t.projectId === selectedProjectDetail.id).length > 0 ? (
                <div className="space-y-2">
                  {tasks.filter(t => t.projectId === selectedProjectDetail.id).map(t => (
                    <div key={t.id} className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="font-bold text-blue-900">{t.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-blue-700">{t.status}</p>
                        <span className="text-xs font-bold text-blue-600">{t.plannedEndDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">אין משימות בפרויקט זה</p>
              )}
            </div>

            <div className="flex justify-start gap-4 pt-4 border-t">
              <button onClick={() => { setDetailModalOpen(false); setEditingProject(selectedProjectDetail); setModalOpen(true); }} className="px-8 py-3 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-700 transition-all">ערוך פרויקט</button>
              <button type="button" onClick={() => setDetailModalOpen(false)} className="px-8 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">סגור</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default ProjectsPage;

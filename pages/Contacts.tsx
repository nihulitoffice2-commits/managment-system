
import React, { useState } from 'react';
import { Contact } from '../types.ts';
import Modal from '../components/Modal.tsx';
import { useData } from '../DataContext.tsx';

const ContactsPage: React.FC = () => {
  const { contacts, projects, addContact, updateContact, deleteContact } = useData();
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState('');

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingContact(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Contact) => {
    setEditingContact(c);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק איש קשר זה?')) {
      deleteContact(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data: Partial<Contact> = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      title: formData.get('title') as string,
      projectId: formData.get('projectId') as string,
      notes: formData.get('notes') as string,
    };

    if (editingContact) {
      updateContact(editingContact.id, data);
    } else {
      const newContact: Contact = {
        id: '',
        organizationId: projects[0]?.organizationId || 'org_unknown',
        ...data as any
      };
      addContact(newContact);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ניהול אנשי קשר</h1>
          <p className="text-slate-500 font-medium">אנשי קשר רלוונטיים בפרויקטים ובארגונים</p>
        </div>
        <button onClick={handleOpenNew} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">+ איש קשר חדש</button>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center">
         <input 
            type="text" 
            placeholder="חפש לפי שם או אימייל..." 
            className="flex-1 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(contact => (
          <div key={contact.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                {contact.name.charAt(0)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(contact)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onClick={() => handleDelete(contact.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
            <h3 className="font-black text-slate-900 leading-tight">{contact.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">{contact.title}</p>
            
            <div className="space-y-2 text-xs font-bold text-slate-600 mb-4">
               <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  <span className="truncate">{contact.email}</span>
               </div>
               <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  <span>{contact.phone}</span>
               </div>
            </div>
            
            <div className="pt-4 border-t border-slate-50 text-[9px] font-black text-slate-400">
              פרויקט: {contact.projectId === 'all' ? 'כל הפרויקטים' : (projects.find(p => p.id === contact.projectId)?.name || 'ללא שיוך')}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingContact ? 'עריכת איש קשר' : 'איש קשר חדש'}>
        <form onSubmit={handleSubmit} className="space-y-6 text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">שם מלא *</label>
              <input name="name" required defaultValue={editingContact?.name} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">תפקיד / תואר</label>
              <input name="title" defaultValue={editingContact?.title} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest text-left" dir="ltr">אימייל *</label>
              <input name="email" required defaultValue={editingContact?.email} type="email" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none text-left" dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest text-left" dir="ltr">טלפון *</label>
              <input name="phone" required defaultValue={editingContact?.phone} type="tel" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none text-left" dir="ltr" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">פרויקט משויך</label>
              <select name="projectId" defaultValue={editingContact?.projectId} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                <option value="">בחר פרויקט...</option>
                <option value="all">כל הפרויקטים</option>
                {projects.filter(p => !p.isDeleted).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 font-bold">בחירה ב"כל הפרויקטים" תאפשר להשתמש באיש הקשר בכל המשימות מכל הפרויקטים.</p>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">הערות</label>
              <textarea name="notes" defaultValue={editingContact?.notes} rows={2} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none resize-none"></textarea>
            </div>
          </div>
          <div className="flex justify-start gap-4 pt-6 border-t">
            <button type="submit" className="bg-blue-600 text-white px-12 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">שמור איש קשר</button>
            <button type="button" onClick={() => setModalOpen(false)} className="bg-slate-100 text-slate-600 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-200">ביטול</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContactsPage;

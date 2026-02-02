
import React, { useState, useMemo } from 'react';
import { Payment, PaymentStatus, PaymentType, UserRole } from '../types.ts';
import Modal from '../components/Modal.tsx';
import { useData } from '../DataContext.tsx';

const PaymentsPage: React.FC = () => {
  const { payments, projects, updatePayment, addPayment, deletePayment, currentUser } = useData();
    const isSysAdmin = currentUser?.role === UserRole.SYS_ADMIN;
    const isPmAdmin = currentUser?.role === UserRole.PM_ADMIN;
    const canManagePayments = isSysAdmin || isPmAdmin;
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'project'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const totals = useMemo(() => {
    const income = payments.filter(p => p.type === PaymentType.INCOME && p.status === PaymentStatus.PAID).reduce((acc, p) => acc + p.actualAmount, 0);
    const expense = payments.filter(p => p.type === PaymentType.EXPENSE && p.status === PaymentStatus.PAID).reduce((acc, p) => acc + p.actualAmount, 0);
    const plannedOut = payments.filter(p => p.type === PaymentType.EXPENSE && p.status !== PaymentStatus.CANCELLED).reduce((acc, p) => acc + p.plannedAmount, 0);
    return { income, expense, balance: income - expense, plannedOut };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let result = payments.filter(p => {
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (selectedProjects.length > 0 && !selectedProjects.includes(p.projectId)) return false;
      if (dateFrom && p.plannedDate < dateFrom) return false;
      if (dateTo && p.plannedDate > dateTo) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.actualAmount - b.actualAmount;
      } else if (sortBy === 'project') {
        const projA = projects.find(p => p.id === a.projectId)?.name || '';
        const projB = projects.find(p => p.id === b.projectId)?.name || '';
        comparison = projA.localeCompare(projB);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [payments, filterType, filterStatus, selectedProjects, dateFrom, dateTo, sortBy, sortDir, projects]);

  const handleOpenNew = () => {
    if (!canManagePayments) return;
    setEditingPayment(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Payment) => {
    if (!canManagePayments) return;
    setEditingPayment(p);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canManagePayments) return;
    if (confirm('האם אתה בטוח שברצונך למחוק תנועה פיננסית זו?')) {
      deletePayment(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    
    const paymentData: Partial<Payment> = {
      projectId: formData.get('projectId') as string,
      type: formData.get('type') as PaymentType,
      category: formData.get('category') as string,
      plannedAmount: Number(formData.get('plannedAmount')),
      actualAmount: Number(formData.get('actualAmount')),
      plannedDate: formData.get('plannedDate') as string,
      status: formData.get('status') as PaymentStatus,
      notes: formData.get('notes') as string,
    };

    if (editingPayment) {
      updatePayment(editingPayment.id, paymentData);
    } else {
      const newPay: Payment = {
        id: '',
        organizationId: 'o1',
        ...paymentData as Payment
      };
      addPayment(newPay);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ניהול תשלומים וכספים</h1>
          <p className="text-slate-500 font-medium">מעקב הכנסות, הוצאות וחריגות תקציב</p>
        </div>
        {canManagePayments && (
          <button onClick={handleOpenNew} className="bg-blue-600 text-white px-8 py-2.5 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">+ תנועה חדשה</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">סה״כ הכנסות (שולם)</p>
          <p className="text-2xl font-black text-green-600">₪{totals.income.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">סה״כ הוצאות (שולם)</p>
          <p className="text-2xl font-black text-rose-600">₪{totals.expense.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">רווח גולמי (בפועל)</p>
          <p className="text-2xl font-black text-blue-600">₪{totals.balance.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">הוצאות מתוכננות (סה״כ)</p>
          <p className="text-2xl font-black text-slate-400">₪{totals.plannedOut.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={() => setFilterType('all')} className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>הכל</button>
              <button onClick={() => setFilterType(PaymentType.INCOME)} className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${filterType === PaymentType.INCOME ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>הכנסות</button>
              <button onClick={() => setFilterType(PaymentType.EXPENSE)} className={`px-5 py-1.5 rounded-lg text-xs font-black transition-all ${filterType === PaymentType.EXPENSE ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>הוצאות</button>
            </div>
            <div className="flex gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <option value="date">מיון: תאריך</option>
                <option value="amount">מיון: סכום</option>
                <option value="project">מיון: פרויקט</option>
              </select>
              <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} className="text-xs font-black bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50">
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase">סינונים:</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Status Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">סטטוס</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <option value="all">הכל</option>
                  {Object.values(PaymentStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">מתאריך</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2" />
              </div>

              {/* Date To */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">עד תאריך</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-2" />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button 
                  onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); setSelectedProjects([]); }} 
                  className="w-full text-xs font-bold bg-slate-100 text-slate-600 rounded-lg px-3 py-2 hover:bg-slate-200 transition-colors"
                >
                  נקה סינונים
                </button>
              </div>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">פרויקטים:</p>
              <div className="flex flex-wrap gap-2">
                {projects.filter(p => !p.isDeleted).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjects(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                      selectedProjects.includes(p.id) ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-5">תנועה / קטגוריה</th>
                <th className="px-6 py-5">פרויקט</th>
                <th className="px-6 py-5 text-center">סוג</th>
                <th className="px-6 py-5 text-center">מתוכנן</th>
                <th className="px-6 py-5 text-center">בפועל</th>
                <th className="px-6 py-5 text-center">סטטוס</th>
                <th className="px-6 py-5 text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 font-bold text-slate-900">{p.category}</td>
                  <td className="px-6 py-5 text-xs text-slate-400 font-bold">
                    {projects.find(proj => proj.id === p.projectId)?.name || 'ללא פרויקט'}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.type === PaymentType.INCOME ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-slate-500">₪{p.plannedAmount.toLocaleString()}</td>
                  <td className="px-6 py-5 text-center font-black text-slate-900">₪{p.actualAmount.toLocaleString()}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                      p.status === PaymentStatus.PAID ? 'bg-green-100 text-green-700' :
                      p.status === PaymentStatus.OVERDUE ? 'bg-rose-500 text-white shadow-sm' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-left">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canManagePayments && (
                         <button onClick={() => handleOpenEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-100 rounded-xl">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                         </button>
                        )}
                        {canManagePayments && (
                         <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-xl">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                         </button>
                        )}
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingPayment ? 'עריכת תנועה פיננסית' : 'רישום תנועה חדשה'}>
        <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">פרויקט משויך *</label>
                <select name="projectId" required defaultValue={editingPayment?.projectId} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                   {projects.filter(p => !p.isDeleted).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סוג תנועה *</label>
                <select name="type" required defaultValue={editingPayment?.type} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                   {Object.values(PaymentType).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">קטגוריה / תיאור *</label>
                <input name="category" required defaultValue={editingPayment?.category} type="text" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none" placeholder="למשל: ספק מדיה, עמלת ניהול..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סכום מתוכנן (₪) *</label>
                <input name="plannedAmount" required defaultValue={editingPayment?.plannedAmount} type="number" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סכום בפועל (₪)</label>
                <input name="actualAmount" defaultValue={editingPayment?.actualAmount} type="number" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">תאריך מתוכנן</label>
                <input name="plannedDate" required defaultValue={editingPayment?.plannedDate} type="date" className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">סטטוס *</label>
                <select name="status" required defaultValue={editingPayment?.status} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none">
                   {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
          </div>
          <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">הערות</label>
              <textarea name="notes" defaultValue={editingPayment?.notes} rows={2} className="w-full border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 outline-none resize-none"></textarea>
          </div>
          <div className="flex justify-start gap-4 pt-6 border-t">
             <button type="submit" className="bg-blue-600 text-white px-12 py-3.5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">שמור תנועה</button>
             <button type="button" onClick={() => setModalOpen(false)} className="bg-slate-100 text-slate-600 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-200">ביטול</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentsPage;

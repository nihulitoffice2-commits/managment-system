
import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 text-right pb-12" dir="rtl">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">הגדרות מערכת</h1>
        <p className="text-slate-500 font-medium">ניהול פרמטרים, ימי עבודה וערכי ברירת מחדל</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 border-r-4 border-blue-600 pr-3">הגדרת ימי עבודה</h3>
          <div className="space-y-4">
             {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day, idx) => (
               <label key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="font-bold text-slate-700">{day}</span>
                  <input type="checkbox" defaultChecked={idx < 5} className="w-5 h-5 rounded-lg text-blue-600 outline-none focus:ring-2 focus:ring-blue-500" />
               </label>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

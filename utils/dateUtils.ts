
/**
 * Israeli Work Days: Sunday (0) to Thursday (4).
 * Friday (5) and Saturday (6) are weekend days.
 */
export const isWorkDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 0 && day <= 4;
};

export const getWorkDaysCount = (startStr: string, endStr: string): number => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (isWorkDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const addWorkDays = (startStr: string, days: number): string => {
  if (days <= 0) return startStr;
  const date = new Date(startStr);
  let added = 0;
  
  // If start is not a work day, move to first work day
  while (!isWorkDay(date)) {
    date.setDate(date.getDate() + 1);
  }

  while (added < days - 1) {
    date.setDate(date.getDate() + 1);
    if (isWorkDay(date)) {
      added++;
    }
  }
  
  return date.toISOString().split('T')[0];
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const diffDays = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

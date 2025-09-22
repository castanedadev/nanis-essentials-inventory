export const fmtUSD = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export const parseNumber = (v: string) => {
  const n = Number((v ?? '').toString().replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export const nowIso = () => new Date().toISOString();

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

export const isSameMonth = (iso: string) => {
  const d = new Date(iso);
  const s = startOfMonth();
  return d >= s;
};

export const isCurrentMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

export const isPreviousMonth = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
};

export const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  // Calculate the difference in milliseconds to get to Sunday
  const diff = day * 24 * 60 * 60 * 1000;
  return new Date(d.getTime() - diff);
};

export const getWeeksInRange = (startDate: Date, endDate: Date) => {
  const weeks = [];
  const current = getStartOfWeek(startDate);

  while (current <= endDate) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      start: new Date(current),
      end: new Date(Math.min(weekEnd.getTime(), endDate.getTime())),
    });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
};

export const isDateInWeek = (iso: string, weekStart: Date, weekEnd: Date) => {
  const date = new Date(iso);
  return date >= weekStart && date <= weekEnd;
};

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

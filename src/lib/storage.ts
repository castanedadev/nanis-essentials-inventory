import { DB, DEFAULT_SETTINGS } from '../types/models';
import { processBackupFile } from './dataConverter';

const STORAGE_KEY = 'nim-db-v1';

export function loadDB(): DB {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const empty: DB = {
      items: [],
      purchases: [],
      sales: [],
      settings: { ...DEFAULT_SETTINGS },
      revenueWithdrawals: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }
  try {
    const parsed: DB = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
    if (!parsed.revenueWithdrawals) parsed.revenueWithdrawals = [];
    return parsed;
  } catch {
    const empty: DB = {
      items: [],
      purchases: [],
      sales: [],
      settings: { ...DEFAULT_SETTINGS },
      revenueWithdrawals: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    return empty;
  }
}

export function saveDB(db: DB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function exportBackup(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function importBackup(json: string) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file format');
    }

    let dbData: DB;

    // Check if it's the new format (has settings and proper structure)
    if ('settings' in parsed && 'items' in parsed && 'purchases' in parsed && 'sales' in parsed) {
      // New format - validate and use directly
      if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
      if (!parsed.revenueWithdrawals) parsed.revenueWithdrawals = [];
      dbData = parsed as DB;
    } else if ('items' in parsed) {
      // Old format - convert it
      dbData = processBackupFile(json);
    } else {
      throw new Error('Invalid backup file - missing required items field');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
  } catch (error) {
    throw new Error(`Failed to import backup: ${error}`);
  }
}

export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

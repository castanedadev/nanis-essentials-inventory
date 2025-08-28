import { useState } from 'react';
import { loadDB, saveDB } from '../lib/storage';
import { DB } from '../types/models';

export function useAppData() {
  const [db, setDb] = useState<DB>(() => loadDB());

  const persist = (next: DB) => {
    setDb(next);
    saveDB(next);
  };

  const refreshData = () => {
    setDb(loadDB());
  };

  return {
    db,
    persist,
    refreshData,
  };
}

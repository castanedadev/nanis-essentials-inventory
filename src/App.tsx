import React, { useState } from 'react';
import './App.css';
import { loadDB, saveDB, exportBackup, importBackup, clearAll } from './lib/storage';
import { DB } from './types/models';
import { TopBar, Tab } from './components/TopBar';
import { InventoryPage } from './components/inventory/InventoryPage';
import { PurchasesPage } from './components/purchases/PurchasesPage';
import { SalesPage } from './components/sales/SalesPage';
import { AnalyticsPage } from './components/analytics/AnalyticsPage';

export default function App() {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [tab, setTab] = useState<Tab>('inventory');

  const persist = (next: DB) => {
    setDb(next);
    saveDB(next);
  };

  const onExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Cosmetics Backup ${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const onImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        importBackup(text);
        setDb(loadDB());
        window.alert('Backup imported successfully!');
      } catch (error) {
        window.alert(`Import failed: ${error}`);
      }
    };
    input.click();
  };

  const onClear = () => {
    if (!window.confirm('Clear all data? This cannot be undone.')) return;
    clearAll();
    setDb(loadDB());
  };

  return (
    <div className="app">
      <TopBar
        active={tab}
        setActive={setTab}
        onExport={onExport}
        onImport={onImport}
        onClear={onClear}
      />

      {tab === 'inventory' && (
        <InventoryPage db={db} persist={persist} onRefresh={() => setDb(loadDB())} />
      )}
      {tab === 'purchases' && <PurchasesPage db={db} persist={persist} />}
      {tab === 'sales' && <SalesPage db={db} persist={persist} />}
      {tab === 'analytics' && <AnalyticsPage db={db} />}
    </div>
  );
}

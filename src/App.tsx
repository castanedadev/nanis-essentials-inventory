import React, { useState } from 'react';
import './App.css';
import { TopBar, Tab } from './components/layout/TopBar';
import { InventoryPage } from './components/pages/inventory';
import { PurchasesPage } from './components/pages/purchases';
import { SalesPage } from './components/pages/sales';
import { TransactionsPage } from './components/pages/transactions';
import { AnalyticsPage } from './components/pages/analytics';
import { useAppData } from './hooks/useAppData';
import { useBackupImport } from './hooks/useBackupImport';

export default function App() {
  const { db, persist, refreshData } = useAppData();
  const [tab, setTab] = useState<Tab>('inventory');
  const { handleExport, handleImport, handleClear } = useBackupImport(refreshData);

  return (
    <div className="app">
      <TopBar
        active={tab}
        setActive={setTab}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />

      {tab === 'inventory' && <InventoryPage db={db} persist={persist} onRefresh={refreshData} />}
      {tab === 'purchases' && <PurchasesPage db={db} persist={persist} />}
      {tab === 'sales' && <SalesPage db={db} persist={persist} />}
      {tab === 'transactions' && <TransactionsPage db={db} persist={persist} />}
      {tab === 'analytics' && <AnalyticsPage db={db} />}
    </div>
  );
}

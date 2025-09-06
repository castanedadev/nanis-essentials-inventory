import React, { useState } from 'react';
import { DB } from '../../../types/models';
import { IncomeStatementPage } from './IncomeStatementPage';
import { CashFlowPage } from './CashFlowPage';
import { ReportsExportPage } from './ReportsExportPage';
import { PageHeader } from '../../molecules/PageHeader';
import { Button } from '../../atoms/Button';

interface FinancialDashboardProps {
  db: DB;
}

export function FinancialDashboard({ db }: FinancialDashboardProps) {
  const [activeTab, setActiveTab] = useState<'income' | 'cashflow' | 'export'>('income');

  return (
    <div className="page">
      <PageHeader title="Financial Reports" />

      <div className="tab-navigation">
        <Button
          variant={activeTab === 'income' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('income')}
        >
          Income Statement
        </Button>
        <Button
          variant={activeTab === 'cashflow' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('cashflow')}
        >
          Cash Flow
        </Button>
        <Button
          variant={activeTab === 'export' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('export')}
        >
          Export Reports
        </Button>
      </div>

      <div className="tab-content">
        {activeTab === 'income' && <IncomeStatementPage db={db} />}
        {activeTab === 'cashflow' && <CashFlowPage db={db} />}
        {activeTab === 'export' && <ReportsExportPage db={db} />}
      </div>
    </div>
  );
}

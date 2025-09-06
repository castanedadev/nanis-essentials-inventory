import { DB } from '../../../types/models';

interface ReportsExportPageProps {
  db: DB;
}

export function ReportsExportPage({ db: _db }: ReportsExportPageProps) {
  const handleExportCSV = (reportType: string) => {
    // This is a placeholder - you can implement CSV export logic here
    console.log(`Exporting ${reportType} as CSV`);
    alert(`${reportType} export functionality coming soon!`);
  };

  const handleExportPDF = (reportType: string) => {
    // This is a placeholder - you can implement PDF export logic here
    console.log(`Exporting ${reportType} as PDF`);
    alert(`${reportType} PDF export functionality coming soon!`);
  };

  return (
    <div className="reports-export">
      <div className="export-section">
        <h2>Export Financial Reports</h2>
        <p>
          Download your financial reports in various formats for external use or record keeping.
        </p>

        <div className="export-options">
          <div className="export-card">
            <h3>Income Statement</h3>
            <p>Export your profit and loss statement showing revenue, expenses, and net income.</p>
            <div className="export-buttons">
              <button
                className="export-btn csv"
                onClick={() => handleExportCSV('Income Statement')}
              >
                Export as CSV
              </button>
              <button
                className="export-btn pdf"
                onClick={() => handleExportPDF('Income Statement')}
              >
                Export as PDF
              </button>
            </div>
          </div>

          <div className="export-card">
            <h3>Cash Flow Statement</h3>
            <p>
              Export your cash flow analysis showing operating, investing, and financing activities.
            </p>
            <div className="export-buttons">
              <button
                className="export-btn csv"
                onClick={() => handleExportCSV('Cash Flow Statement')}
              >
                Export as CSV
              </button>
              <button
                className="export-btn pdf"
                onClick={() => handleExportPDF('Cash Flow Statement')}
              >
                Export as PDF
              </button>
            </div>
          </div>

          <div className="export-card">
            <h3>Detailed Transaction Report</h3>
            <p>Export a comprehensive list of all transactions, sales, and purchases.</p>
            <div className="export-buttons">
              <button
                className="export-btn csv"
                onClick={() => handleExportCSV('Transaction Report')}
              >
                Export as CSV
              </button>
              <button
                className="export-btn pdf"
                onClick={() => handleExportPDF('Transaction Report')}
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

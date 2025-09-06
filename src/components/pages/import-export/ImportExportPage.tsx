import React from 'react';
import { Button } from '../../atoms/Button';
import { PageHeader } from '../../molecules/PageHeader';
import { Heading, Text } from '../../atoms/Typography';

interface ImportExportPageProps {
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}

export function ImportExportPage({ onExport, onImport, onClear }: ImportExportPageProps) {
  return (
    <div className="page">
      <PageHeader title="Data Management" />

      <div className="cards two-cols">
        {/* Export Data Card */}
        <div className="card">
          <div className="card-title">
            <Heading level={3}>📦 Export Data</Heading>
          </div>
          <Text variant="muted" className="card-description">
            Download a backup of all your data including inventory items, sales, purchases,
            transactions, and revenue information. This creates a complete backup file that can be
            imported later.
          </Text>

          <div className="card-features">
            <Text variant="small">• Complete data backup</Text>
            <Text variant="small">• JSON format for easy restoration</Text>
            <Text variant="small">• Includes all database tables</Text>
            <Text variant="small">• Safe for long-term storage</Text>
          </div>

          <div className="card-actions">
            <Button variant="primary" onClick={onExport}>
              📥 Export Backup
            </Button>
          </div>
        </div>

        {/* Import Data Card */}
        <div className="card">
          <div className="card-title">
            <Heading level={3}>📤 Import Data</Heading>
          </div>
          <Text variant="muted" className="card-description">
            Restore data from a previously exported backup file. This will merge the imported data
            with your existing data, allowing you to restore from backups or migrate data between
            devices.
          </Text>

          <div className="card-features">
            <Text variant="small">• Restore from backup files</Text>
            <Text variant="small">• Merges with existing data</Text>
            <Text variant="small">• Handles duplicate prevention</Text>
            <Text variant="small">• Validates data integrity</Text>
          </div>

          <div className="card-actions">
            <Button onClick={onImport}>📤 Import Backup</Button>
          </div>
        </div>

        {/* Clear Data Card */}
        <div className="card danger-card">
          <div className="card-title">
            <Heading level={3}>🗑️ Clear All Data</Heading>
          </div>
          <Text variant="muted" className="card-description">
            Permanently delete all data from the application. This includes all inventory items,
            sales records, purchases, transactions, and revenue data. This action cannot be undone.
          </Text>

          <div className="card-features">
            <Text variant="small" className="warning-text">
              ⚠️ Removes all inventory items
            </Text>
            <Text variant="small" className="warning-text">
              ⚠️ Deletes all sales records
            </Text>
            <Text variant="small" className="warning-text">
              ⚠️ Erases transaction history
            </Text>
            <Text variant="small" className="warning-text">
              ⚠️ Cannot be undone
            </Text>
          </div>

          <div className="card-actions">
            <Button variant="danger" onClick={onClear}>
              🗑️ Clear All Data
            </Button>
          </div>
        </div>

        {/* Data Info Card */}
        <div className="card info-card">
          <div className="card-title">
            <Heading level={3}>ℹ️ Data Information</Heading>
          </div>
          <Text variant="muted" className="card-description">
            Your data is stored locally in your browser's storage. Regular backups are recommended
            to prevent data loss. Data is automatically saved as you make changes.
          </Text>

          <div className="card-features">
            <Text variant="small">• Data stored locally in browser</Text>
            <Text variant="small">• Automatic saving on changes</Text>
            <Text variant="small">• Export regularly for safety</Text>
            <Text variant="small">• Works offline</Text>
          </div>

          <div className="card-actions">
            <Text variant="small" className="info-text">
              💡 Tip: Export your data regularly to prevent accidental loss
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

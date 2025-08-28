import { exportBackup, importBackup, clearAll } from '../lib/storage';

export function useBackupImport(onDataChange: () => void) {
  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Cosmetics Backup ${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        importBackup(text);
        onDataChange();
        window.alert('Backup imported successfully!');
      } catch (error) {
        window.alert(`Import failed: ${error}`);
      }
    };
    input.click();
  };

  const handleClear = () => {
    if (!window.confirm('Clear all data? This cannot be undone.')) return;
    clearAll();
    onDataChange();
  };

  return {
    handleExport,
    handleImport,
    handleClear,
  };
}

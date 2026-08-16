import { useState } from 'react';
import { adminSettingsService } from '../services/AdminSettingsService';

function AdminSettingsPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const exportData = async () => {
    setError('');
    setMessage('');
    try {
      const workbook = await adminSettingsService.exportWorkbook();
      const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'users.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      setMessage('The current temporary workbook has been downloaded.');
    } catch (exportError) {
      setError(exportError.message || 'Unable to export the temporary workbook.');
    }
  };
  return <section className="card"><h1>Admin Settings</h1><p className="helper-text">Download the current temporary Excel data snapshot.</p><button className="add-btn" type="button" onClick={exportData}>Export Excel Data</button>{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section>;
}

export default AdminSettingsPage;

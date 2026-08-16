import { useEffect, useState } from 'react';
import { Permissions } from '../auth/permissions';
import { authorizationService } from '../services/AuthorizationService';
import { environmentService } from '../services/EnvironmentService';
import { jurisdictions } from '../config/jurisdictionEnvironments';

const initialForm = { jurisdiction: '', name: '', description: '', status: 'ACTIVE' };

function EnvironmentManagementPage() {
  const canManage = authorizationService.hasPermission(Permissions.MANAGE_ENVIRONMENTS);
  const [environments, setEnvironments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);

  const refreshEnvironments = async () => {
    try {
      setEnvironments(await environmentService.listEnvironments());
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    const loadEnvironments = async () => {
      try {
        const loadedEnvironments = await environmentService.listEnvironments();
        if (isCurrent) setEnvironments(loadedEnvironments);
      } catch (loadError) {
        if (isCurrent) setError(loadError.message);
      }
    };
    void loadEnvironments();
    return () => { isCurrent = false; };
  }, []);

  const createEnvironment = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await environmentService.updateEnvironment(editingId, form);
      } else {
        await environmentService.createEnvironment(form);
      }
      setForm(initialForm);
      setEditingId(null);
      setMessage(editingId ? 'Environment updated successfully.' : 'Environment added successfully.');
      await refreshEnvironments();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const toggleEnvironment = async (environment) => {
    setError('');
    try {
      await environmentService.updateEnvironment(environment.id, {
        status: environment.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      await refreshEnvironments();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const editEnvironment = (environment) => {
    setError('');
    setMessage('');
    setEditingId(environment.id);
    setForm({
      jurisdiction: environment.jurisdiction,
      name: environment.name,
      description: environment.description,
      status: environment.status,
    });
  };

  return (
    <div className="management-layout">
      {canManage && <section className="card"><h1>Environment Management</h1><p className="helper-text">Add environment options for a jurisdiction and control whether they are active.</p><form className="input-grid management-form" onSubmit={createEnvironment}><label className="field"><span>Jurisdiction</span><input list="known-jurisdictions" value={form.jurisdiction} onChange={(event) => setForm((previous) => ({ ...previous, jurisdiction: event.target.value.toUpperCase() }))} placeholder="AZ" /><datalist id="known-jurisdictions">{jurisdictions.map((jurisdiction) => <option key={jurisdiction} value={jurisdiction} />)}</datalist></label><label className="field"><span>Environment Name</span><input value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="QA4" /></label><label className="field"><span>Status</span><select value={form.status} onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label><label className="field wide-field"><span>Description</span><input value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} /></label><button className="submit-btn" type="submit">{editingId ? 'Save Environment Changes' : 'Add Environment'}</button>{editingId && <button className="secondary-btn" type="button" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel Edit</button>}</form></section>}
      <section className="card table-card"><h1>{canManage ? 'Environments' : 'Available Environments'}</h1>{message && <p className="form-success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="table-scroll"><table><thead><tr><th>Jurisdiction</th><th>Name</th><th>Description</th><th>Status</th>{canManage && <th>Action</th>}</tr></thead><tbody>{environments.map((environment) => <tr key={environment.id}><td>{environment.jurisdiction || '—'}</td><td>{environment.name}</td><td>{environment.description}</td><td><span className={`status-badge ${environment.status.toLowerCase()}`}>{environment.status}</span></td>{canManage && <td><div className="table-actions"><button className="table-action" type="button" onClick={() => editEnvironment(environment)}>Edit</button><button className="table-action" type="button" onClick={() => toggleEnvironment(environment)}>{environment.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></div></td>}</tr>)}</tbody></table></div></section>
    </div>
  );
}

export default EnvironmentManagementPage;

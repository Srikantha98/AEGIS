import { useEffect, useState } from 'react';
import { Permissions } from '../auth/permissions';
import { authorizationService } from '../services/AuthorizationService';
import { environmentService } from '../services/EnvironmentService';

const initialForm = {
  jurisdiction: '',
  environment: '',
  txe1Ip: '',
  txe2Ip: '',
  adServerIp: '',
  username: '',
  password: '',
  status: 'ACTIVE',
};

const isValidIp = (value) => {
  const parts = value.trim().split('.');

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }

    const number = Number(part);
    return number >= 0 && number <= 255;
  });
};

function EnvironmentManagementPage() {
  const canManage = authorizationService.hasPermission(
    Permissions.MANAGE_ENVIRONMENTS
  );

  const [environments, setEnvironments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshEnvironments = async () => {
    try {
      const data = await environmentService.listEnvironments();
      setEnvironments(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load environments.');
    }
  };

  useEffect(() => {
    let isCurrent = true;

    const loadEnvironments = async () => {
      try {
        const data = await environmentService.listEnvironments();

        if (isCurrent) {
          setEnvironments(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.message || 'Unable to load environments.');
        }
      }
    };

    void loadEnvironments();

    return () => {
      isCurrent = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError('');
    setMessage('');

    // Validate Jurisdiction
    if (!form.jurisdiction.trim()) {
      setError('Jurisdiction is required.');
      return;
    }

    // Validate Environment
    if (!form.environment.trim()) {
      setError('Environment is required.');
      return;
    }

    // Validate IP addresses
    const ipFields = [
      ['TXE1 IP', form.txe1Ip],
      ['TXE2 IP', form.txe2Ip],
      ['AD Server IP', form.adServerIp],
    ];

    for (const [label, ip] of ipFields) {
      if (!isValidIp(ip)) {
        setError(`${label} must be a valid IPv4 address.`);
        return;
      }
    }

    if (!form.username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!editingId && !form.password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        // Do not send an empty password while editing.
        const payload = {
          jurisdiction: form.jurisdiction.trim(),
          environment: form.environment.trim(),
          txe1Ip: form.txe1Ip.trim(),
          txe2Ip: form.txe2Ip.trim(),
          adServerIp: form.adServerIp.trim(),
          username: form.username.trim(),
          status: form.status,
        };

        if (form.password) {
          payload.password = form.password;
        }

        await environmentService.updateEnvironment(editingId, payload);

        setMessage('Environment updated successfully.');
      } else {
        await environmentService.createEnvironment({
          jurisdiction: form.jurisdiction.trim(),
          environment: form.environment.trim(),
          txe1Ip: form.txe1Ip.trim(),
          txe2Ip: form.txe2Ip.trim(),
          adServerIp: form.adServerIp.trim(),
          username: form.username.trim(),
          password: form.password,
          status: form.status,
        });

        setMessage('Environment added successfully.');
      }

      resetForm();
      await refreshEnvironments();
    } catch (submitError) {
      setError(
        submitError.message ||
          `Unable to ${editingId ? 'update' : 'add'} environment.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEnvironment = async (environment) => {
    setError('');
    setMessage('');

    try {
      await environmentService.updateEnvironment(environment.id, {
        status:
          environment.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });

      setMessage(
        environment.status === 'ACTIVE'
          ? 'Environment deactivated successfully.'
          : 'Environment activated successfully.'
      );

      await refreshEnvironments();
    } catch (updateError) {
      setError(
        updateError.message || 'Unable to update environment status.'
      );
    }
  };

  const editEnvironment = (environment) => {
    setError('');
    setMessage('');
    setEditingId(environment.id);

    setForm({
      jurisdiction: environment.jurisdiction || '',
      environment: environment.environment || '',
      txe1Ip: environment.txe1Ip || '',
      txe2Ip: environment.txe2Ip || '',
      adServerIp: environment.adServerIp || '',
      username: environment.username || '',
      // Never assume the API returns the real password.
      password: '',
      status: environment.status || 'ACTIVE',
    });
  };

  return (
    <div className="management-layout">
      {canManage && (
        <section className="card">
          <h1>Manage Environment</h1>

          <p className="helper-text">
            Add jurisdiction and environment connection details and
            control whether the environment is active.
          </p>

          <form
            className="input-grid management-form"
            onSubmit={handleSubmit}
          >
            {/* Jurisdiction */}
            <label className="field">
              <span>Jurisdiction</span>
              <input
                type="text"
                value={form.jurisdiction}
                onChange={(event) =>
                  updateField('jurisdiction', event.target.value)
                }
                placeholder="India"
                required
              />
            </label>

            {/* Environment */}
            <label className="field">
              <span>Environment</span>
              <input
                type="text"
                value={form.environment}
                onChange={(event) =>
                  updateField('environment', event.target.value)
                }
                placeholder="QA4"
                required
              />
            </label>

            {/* TXE1 */}
            <label className="field">
              <span>TXE1 IP</span>
              <input
                type="text"
                value={form.txe1Ip}
                onChange={(event) =>
                  updateField('txe1Ip', event.target.value)
                }
                placeholder="192.168.1.10"
                inputMode="decimal"
                required
              />
            </label>

            {/* TXE2 */}
            <label className="field">
              <span>TXE2 IP</span>
              <input
                type="text"
                value={form.txe2Ip}
                onChange={(event) =>
                  updateField('txe2Ip', event.target.value)
                }
                placeholder="192.168.1.11"
                inputMode="decimal"
                required
              />
            </label>

            {/* AD Server */}
            <label className="field">
              <span>AD Server</span>
              <input
                type="text"
                value={form.adServerIp}
                onChange={(event) =>
                  updateField('adServerIp', event.target.value)
                }
                placeholder="192.168.1.20"
                inputMode="decimal"
                required
              />
            </label>

            {/* Username */}
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) =>
                  updateField('username', event.target.value)
                }
                placeholder="domain\\username"
                autoComplete="username"
                required
              />
            </label>

            {/* Password */}
            <label className="field">
              <span>
                Password
                {editingId && (
                  <small>
                    {' '}
                    (leave blank to keep existing password)
                  </small>
                )}
              </span>

              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  updateField('password', event.target.value)
                }
                placeholder={
                  editingId
                    ? 'Enter new password'
                    : 'Enter password'
                }
                autoComplete={
                  editingId ? 'new-password' : 'current-password'
                }
                required={!editingId}
              />
            </label>

            {/* Status */}
            <label className="field">
              <span>Status</span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField('status', event.target.value)
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>

            {/* Buttons */}
            <div className="form-actions">
              <button
                className="submit-btn"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Environment'}
              </button>

              {editingId && (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="card table-card">
        <h1>
          {canManage ? 'Environments' : 'Available Environments'}
        </h1>

        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Jurisdiction</th>
                <th>Environment</th>
                <th>TXE1 IP</th>
                <th>TXE2 IP</th>
                <th>AD Server IP</th>
                <th>Username</th>
                <th>Status</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {environments.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 8 : 7}
                    className="empty-state"
                  >
                    No environments found.
                  </td>
                </tr>
              ) : (
                environments.map((environment) => {
                  const status = environment.status || 'INACTIVE';

                  return (
                    <tr key={environment.id}>
                      <td>{environment.jurisdiction || '—'}</td>
                      <td>{environment.environment || '—'}</td>
                      <td>{environment.txe1Ip || '—'}</td>
                      <td>{environment.txe2Ip || '—'}</td>
                      <td>{environment.adServerIp || '—'}</td>
                      <td>{environment.username || '—'}</td>

                      <td>
                        <span
                          className={`status-badge ${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>

                      {canManage && (
                        <td>
                          <div className="table-actions">
                            <button
                              className="table-action"
                              type="button"
                              onClick={() =>
                                editEnvironment(environment)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="table-action"
                              type="button"
                              onClick={() =>
                                toggleEnvironment(environment)
                              }
                            >
                              {status === 'ACTIVE'
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EnvironmentManagementPage;
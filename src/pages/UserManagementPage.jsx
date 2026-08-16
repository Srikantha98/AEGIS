import { useEffect, useState } from 'react';
import { Roles } from '../auth/permissions';
import { userManagementService } from '../services/UserManagementService';

const initialForm = {
  name: '',
  username: '',
  password: '',
  role: Roles.END_USER,
  isActive: true,
};

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refreshUsers = async () => {
    try {
      setUsers(await userManagementService.listUsers());
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    const loadUsers = async () => {
      try {
        const loadedUsers = await userManagementService.listUsers();
        if (isCurrent) setUsers(loadedUsers);
      } catch (loadError) {
        if (isCurrent) setError(loadError.message);
      }
    };
    void loadUsers();
    return () => { isCurrent = false; };
  }, []);

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const createUser = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSaving(true);
    try {
      await userManagementService.createUser(form);
      setForm(initialForm);
      setMessage('User created. Active users can sign in immediately.');
      await refreshUsers();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUser = async (user) => {
    setMessage('');
    setError('');
    try {
      await userManagementService.setUserActive(user.id, !user.isActive);
      await refreshUsers();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="management-layout">
      <section className="card">
        <h1>User Management</h1>
        <p className="helper-text">Create portal users and assign their access role.</p>
        <form className="input-grid management-form" onSubmit={createUser}>
          <label className="field"><span>Name</span><input value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
          <label className="field"><span>Username</span><input value={form.username} onChange={(event) => update('username', event.target.value)} /></label>
          <label className="field"><span>Password</span><input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} /></label>
          <label className="field"><span>Role</span><select value={form.role} onChange={(event) => update('role', event.target.value)}>{Object.values(Roles).map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          <label className="checkbox-field"><input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} /> Active user</label>
          <button className="submit-btn" type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create User'}</button>
        </form>
        {message && <p className="form-success" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
      <section className="card table-card">
        <h2>Users</h2>
        <div className="table-scroll"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.username}</td><td><span className="role-badge">{user.role}</span></td><td>{user.isActive ? 'Active' : 'Inactive'}</td><td><button className="table-action" type="button" onClick={() => toggleUser(user)}>{user.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

export default UserManagementPage;

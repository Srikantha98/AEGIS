import { Roles } from '../auth/permissions';

const roleCopy = {
  [Roles.ADMIN]: {
    title: 'Admin Dashboard',
    description: 'Manage users and environments, and monitor all system operations.',
  },
  [Roles.TESTER]: {
    title: 'Testing Dashboard',
    description: 'Select an available environment and run approved testing operations.',
  },
  [Roles.END_USER]: {
    title: 'System Operations',
    description: 'Use the approved actions below to view the current system state.',
  },
};

function DashboardPage({ user, goTo }) {
  const content = roleCopy[user.role];
  return (
    <section className="dashboard-hero card">
      <p className="eyebrow">{user.role.replace('_', ' ')}</p>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <div className="dashboard-actions">
        <button className="add-btn" type="button" onClick={() => goTo('operations')}>
          Open System Operations
        </button>
        {user.role === Roles.ADMIN && (
          <>
            <button className="secondary-btn" type="button" onClick={() => goTo('users')}>
              Manage Users
            </button>
            <button className="secondary-btn" type="button" onClick={() => goTo('environments')}>
              Manage Environments
            </button>
          </>
        )}
        {user.role === Roles.TESTER && (
          <button className="secondary-btn" type="button" onClick={() => goTo('environments')}>
            View Environments
          </button>
        )}
      </div>
    </section>
  );
}

export default DashboardPage;

import React from 'react';
import { Permissions } from './auth/permissions';
import Navbar from './components/Navbar';
import OutputSection from './components/OutputSection';
import { authService } from './services/AuthService';
import { authorizationService } from './services/AuthorizationService';
import { getRequest, postRequest } from './services/api';
import { blankFile, getIPv4Error } from './utils/helpers';
import AdminSettingsPage from './pages/AdminSettingsPage';
import CopyBuildFilesPage from './pages/CopyBuildFilesPage';
import DashboardPage from './pages/DashboardPage';
import EnvironmentManagementPage from './pages/EnvironmentManagementPage';
import RestoreRdbPage from './pages/RestoreRdbPage';
import RestoreTxePage from './pages/RestoreTxePage';
import SystemOperationsPage from './pages/SystemOperationsPage';
import UserManagementPage from './pages/UserManagementPage';
import LoginPage from './components/LoginPage';

const ipAddressLabels = {
  txe1: 'TXE1 IP address', txe2: 'TXE2 IP address', adServer: 'AD Server IP address',
  rdb1: 'RDB1 IP address', rdb2: 'RDB2 IP address',
};

const pagePermissions = {
  dashboard: Permissions.VIEW_DASHBOARD,
  operations: Permissions.VIEW_SYSTEM_OPERATIONS,
  environments: Permissions.VIEW_ENVIRONMENTS,
  users: Permissions.VIEW_USERS,
  'restore-rdb': Permissions.RUN_SYSTEM_OPERATIONS,
  'restore-txe': Permissions.RUN_SYSTEM_OPERATIONS,
  'copy-builds': Permissions.RUN_SYSTEM_OPERATIONS,
  'admin-settings': Permissions.ADMIN_SETTINGS,
};

const getPageFromHash = () => window.location.hash.replace(/^#\/?/, '') || 'dashboard';

function App() {
  const [currentUser, setCurrentUser] = React.useState(() => authorizationService.getCurrentUser());
  const [activePage, setActivePage] = React.useState(getPageFromHash);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [loading, setLoading] = React.useState('');
  const [response, setResponse] = React.useState(null);
  const [error, setError] = React.useState('');
  const [config, setConfig] = React.useState({ txe1: '', txe2: '', username: '', password: '', adServer: '', settime: '' });
  const [games, setGames] = React.useState([]);
  const [rdbRestore, setRdbRestore] = React.useState({ rdb1: '', rdb2: '', username: '', password: '', restoreMode: 'Listener', restoreFilePath: '', dbName: '', restoreType: 'FULL' });
  const [txeRestore, setTxeRestore] = React.useState({ txe1: '', txe2: '', username: '', password: '', restoreFileName: '', restorePath: '' });
  const [copyRdb, setCopyRdb] = React.useState({ sourcePath: '', destinationPath: '', remoteServer1: '', remoteServer2: '', username: '', password: '', files: [blankFile()] });
  const [copyTxe, setCopyTxe] = React.useState({ sourcePath: '', destinationPath: '', remoteServer1: '', remoteServer2: '', username: '', password: '', files: [blankFile()] });

  const navigate = React.useCallback((page) => {
    const permittedPage = pagePermissions[page] ? page : 'dashboard';
    window.location.hash = `/${permittedPage}`;
    setActivePage(permittedPage);
  }, []);

  React.useEffect(() => {
    const onHashChange = () => {
      const requestedPage = getPageFromHash();
      if (
        currentUser &&
        pagePermissions[requestedPage] &&
        !authorizationService.hasPermission(pagePermissions[requestedPage])
      ) {
        setError('You are not authorized to access that page.');
        window.location.hash = '/dashboard';
        return;
      }
      setActivePage(requestedPage);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [currentUser]);

  React.useEffect(() => {
    if (!currentUser) return;
    const requestedPage = getPageFromHash();
    if (
      pagePermissions[requestedPage] &&
      !authorizationService.hasPermission(pagePermissions[requestedPage])
    ) {
      window.location.hash = '/dashboard';
    }
  }, [activePage, currentUser]);

  const updateConfig = (field, value) => setConfig((previous) => ({ ...previous, [field]: value }));
  const updateGame = (index, field, value) => setGames((previous) => previous.map((game, gameIndex) => gameIndex === index ? { ...game, [field]: value } : game));
  const buildCommonPayload = () => ({ ...config, games: games.filter((game) => (game.gameName || game.game_name || '').trim() || (game.winningNumbers || '').trim()) });

  const normaliseErrorResponse = (requestError) => {
    if (requestError.response?.data) return requestError.response.data;
    if (requestError.message) {
      return {
        status: 'Failed',
        message: requestError.message.includes('Network Error')
          ? 'Unable to connect to Flask backend. Please make sure backend is running on port 5000.'
          : requestError.message,
      };
    }
    return { status: 'Failed', message: 'Unexpected error occurred while calling Flask backend.' };
  };

  const getIpValidationMessage = (data) => {
    for (const [field, label] of Object.entries(ipAddressLabels)) {
      const value = data?.[field];
      const ipError = getIPv4Error(value);
      if (value && ipError) return `${label}: ${ipError}`;
    }
    return '';
  };

  const callGet = async (action, endpoint, params = config) => {
    const validationError = getIpValidationMessage(params);
    if (validationError) { setError(validationError); setResponse(null); return; }
    setLoading(action); setError(''); setResponse(null);
    try { setResponse((await getRequest(endpoint, params)).data); }
    catch (requestError) { setResponse(normaliseErrorResponse(requestError)); }
    finally { setLoading(''); }
  };

  const callPost = async (action, endpoint, payload) => {
    const validationError = getIpValidationMessage(payload);
    if (validationError) { setError(validationError); setResponse(null); return; }
    setLoading(action); setError(''); setResponse(null);
    try { setResponse((await postRequest(endpoint, payload)).data); }
    catch (requestError) { setResponse(normaliseErrorResponse(requestError)); }
    finally { setLoading(''); }
  };

  const login = async (username, password) => {
    const user = await authService.login(username, password);
    setCurrentUser(user);
    setError('');
    navigate('dashboard');
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setResponse(null);
    setError('');
    window.location.hash = '';
  };

  if (!currentUser || !authorizationService.isAuthenticated()) return <LoginPage onLogin={login} />;

  const requestedPage = pagePermissions[activePage] ? activePage : 'dashboard';
  const visiblePage = authorizationService.hasPermission(pagePermissions[requestedPage])
    ? requestedPage
    : 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', permission: Permissions.VIEW_DASHBOARD },
    { id: 'operations', label: 'System Operations', permission: Permissions.VIEW_SYSTEM_OPERATIONS },
    { id: 'environments', label: 'Environments', permission: Permissions.VIEW_ENVIRONMENTS },
    { id: 'restore-rdb', label: 'Restore RDB', permission: Permissions.RUN_SYSTEM_OPERATIONS },
    { id: 'restore-txe', label: 'Restore TXE', permission: Permissions.RUN_SYSTEM_OPERATIONS },
    { id: 'copy-builds', label: 'Copy Build Files', permission: Permissions.RUN_SYSTEM_OPERATIONS },
    { id: 'users', label: 'User Management', permission: Permissions.VIEW_USERS },
    { id: 'admin-settings', label: 'Admin Settings', permission: Permissions.ADMIN_SETTINGS },
  ].filter((item) => authorizationService.hasPermission(item.permission));

  const renderPage = () => {
    switch (visiblePage) {
      case 'operations': return <SystemOperationsPage config={config} updateConfig={updateConfig} games={games} setGames={setGames} updateGame={updateGame} callGet={callGet} callPost={callPost} buildCommonPayload={buildCommonPayload} loading={loading} canViewConfiguration={authorizationService.hasPermission(Permissions.VIEW_SYSTEM_OPERATIONS)} hasPermission={(permission) => authorizationService.hasPermission(permission)} />;
      case 'environments': return <EnvironmentManagementPage />;
      case 'users': return <UserManagementPage />;
      case 'restore-rdb': return <RestoreRdbPage rdbRestore={rdbRestore} setRdbRestore={setRdbRestore} callPost={callPost} loading={loading} />;
      case 'restore-txe': return <RestoreTxePage txeRestore={txeRestore} setTxeRestore={setTxeRestore} callPost={callPost} loading={loading} />;
      case 'copy-builds': return <CopyBuildFilesPage copyRdb={copyRdb} setCopyRdb={setCopyRdb} copyTxe={copyTxe} setCopyTxe={setCopyTxe} callPost={callPost} loading={loading} />;
      case 'admin-settings': return <AdminSettingsPage />;
      default: return <DashboardPage user={currentUser} goTo={navigate} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar userName={currentUser.name} userRole={currentUser.role} isSidebarOpen={isSidebarOpen} onMenuClick={() => setIsSidebarOpen((open) => !open)} onLogout={logout} />
      <div className={isSidebarOpen ? 'app' : 'app sidebar-collapsed'}>
        <aside id="side-navigation"><nav className="side-nav">{menuItems.map((item) => <button type="button" key={item.id} className={visiblePage === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { navigate(item.id); if (window.innerWidth <= 900) setIsSidebarOpen(false); }}>{item.label}</button>)}</nav></aside>
        <main className="main-area">{renderPage()}<OutputSection loading={loading} error={error} response={response} clearOutput={() => { setError(''); setResponse(null); }} /></main>
      </div>
    </div>
  );
}

export default App;

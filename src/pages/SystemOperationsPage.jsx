import { Permissions } from '../auth/permissions';
import EnvironmentSetup from '../components/Environments';
import Input from '../components/Input';

const actions = [
  { label: 'System Status', className: 'blue', permission: Permissions.SYSTEM_STATUS, type: 'get', endpoint: '/api/system-status' },
  { label: 'Bring up System', className: 'green', permission: Permissions.RUN_SYSTEM_OPERATIONS, type: 'post', endpoint: '/api/bring-up-system' },
  { label: 'Idle System', className: 'purple', permission: Permissions.RUN_SYSTEM_OPERATIONS, type: 'get', endpoint: '/api/idle-system' },
  { label: 'TXE Interacted Time', className: 'teal1', permission: Permissions.TXE_INTERACTED_TIME, type: 'get', endpoint: '/api/txe-interacted-time' },
  { label: 'Enter Win Numbers', className: 'teal', permission: Permissions.RUN_SYSTEM_OPERATIONS, type: 'post', endpoint: '/api/enter-win-numbers' },
  { label: 'Close All Games', className: 'darkorange', permission: Permissions.RUN_SYSTEM_OPERATIONS, type: 'post', endpoint: '/api/close-all-games' },
  { label: 'Run Shutdown', className: 'darkred', permission: Permissions.RUN_SYSTEM_OPERATIONS, type: 'post', endpoint: '/api/run-shutdown' },
  { label: 'Run Day End', className: 'mahogany', permission: Permissions.RUN_SYSTEM_OPERATIONS, type: 'post', endpoint: '/api/run-day-end' },
];

function SystemOperationsPage({
  config, updateConfig, games, updateGame, addGame, removeGame, callGet, callPost,
  buildCommonPayload, loading, canViewConfiguration, hasPermission,
}) {
  const runAction = (action) => {
    if (action.type === 'get') {
      callGet(action.label, action.endpoint, config);
    } else {
      callPost(action.label, action.endpoint, buildCommonPayload());
    }
  };

  return (
    <div>
      <EnvironmentSetup />
      {canViewConfiguration && <div className="operations-config-grid">
        <section className="card"><h2>System Configuration</h2><div className="input-grid">
          <Input label="TXE1 IP" value={config.txe1} onChange={(value) => updateConfig('txe1', value)} placeholder="Enter TXE1 IP" isIpAddress />
          <Input label="TXE2 IP" value={config.txe2} onChange={(value) => updateConfig('txe2', value)} placeholder="Enter TXE2 IP" isIpAddress />
          <Input label="Username" value={config.username} onChange={(value) => updateConfig('username', value)} placeholder="Enter username" />
          <Input label="Password" type="password" value={config.password} onChange={(value) => updateConfig('password', value)} placeholder="Enter password" />
          <Input label="AD Server IP" value={config.adServer} onChange={(value) => updateConfig('adServer', value)} placeholder="Enter AD Server IP" isIpAddress />
          <Input label="Set Time" value={config.settime} onChange={(value) => updateConfig('settime', value)} placeholder="07/30/2026 15:30:00" helper="Format: MM/DD/YYYY HH:MM:SS" />
        </div></section>
        <section className="card game-card"><div className="title-row"><h2>Game Configuration</h2><button type="button" className="add-btn" onClick={addGame}>+ Add Game</button></div><p className="helper-text">Initially 2 games are shown. Use + Add Game when more games are required.</p><div className="game-list">
          {games.map((game, index) => <div className="game-row" key={`game-${index}`}><div className="row-title">Game {index + 1}</div><input value={game.gameName} onChange={(event) => updateGame(index, 'gameName', event.target.value)} placeholder={`Enter Game ${index + 1}`} /><input value={game.drawNumber} onChange={(event) => updateGame(index, 'drawNumber', event.target.value)} placeholder={`Enter Draw ${index + 1}`} /><input value={game.winningNumbers} onChange={(event) => updateGame(index, 'winningNumbers', event.target.value)} placeholder="01,05,10,20,30,40" /><button type="button" className="game-remove-btn" onClick={() => removeGame(index)}>Remove</button></div>)}
        </div></section>
      </div>}
      <section className="card actions-card"><h2>Actions</h2>{!hasPermission(Permissions.RUN_SYSTEM_OPERATIONS) && <p className="helper-text">Only System Status and TXE Interacted Time are available for your role.</p>}<div className="action-grid">
        {actions.map((action) => { const allowed = hasPermission(action.permission); return <button key={action.label} type="button" className={`operation-btn ${action.className}`} disabled={Boolean(loading) || !allowed} title={allowed ? action.label : 'Not available for your role'} onClick={() => runAction(action)}>{action.label}</button>; })}
      </div></section>
    </div>
  );
}

export default SystemOperationsPage;

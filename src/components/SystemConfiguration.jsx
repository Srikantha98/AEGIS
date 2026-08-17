import Input from './Input';

function SystemConfiguration({
  environmentConfig,
  config = {},
  updateConfig,
  selectedTxe1,
  setSelectedTxe1,
  selectedTxe2,
  setSelectedTxe2,
  selectedAdServer,
  setSelectedAdServer,
  txe1Options = ['None'],
  txe2Options = ['None'],
  adServerOptions = ['None'],
}) {
  return (
    <section className="card">
      <h2>System Configuration</h2>

      <div className="input-grid-3">
        {/* =================================================
            TXE1
        ================================================== */}
        <label className="field">
          <span>TXE1</span>

          <select
            value={selectedTxe1}
            onChange={(event) => {
              setSelectedTxe1(event.target.value);
            }}
            aria-label="Select TXE1"
            disabled={!environmentConfig}
          >
            {txe1Options.map((option) => (
              <option key={`txe1-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* =================================================
            TXE2
        ================================================== */}
        <label className="field">
          <span>TXE2</span>

          <select
            value={selectedTxe2}
            onChange={(event) => {
              setSelectedTxe2(event.target.value);
            }}
            aria-label="Select TXE2"
            disabled={!environmentConfig}
          >
            {txe2Options.map((option) => (
              <option key={`txe2-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* =================================================
            AD SERVER
        ================================================== */}
        <label className="field">
          <span>AD Server</span>

          <select
            value={selectedAdServer}
            onChange={(event) => {
              setSelectedAdServer(event.target.value);
            }}
            aria-label="Select AD Server"
            disabled={!environmentConfig}
          >
            {adServerOptions.map((option) => (
              <option key={`ad-server-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* =================================================
            USERNAME
        ================================================== */}
        <Input
          label="Username"
          value={environmentConfig?.username ?? config.username ?? ''}
          onChange={(value) => updateConfig('username', value)}
          placeholder="Enter username"
        />

        {/* =================================================
            PASSWORD
        ================================================== */}
        <Input
          label="Password"
          type="password"
          value={environmentConfig?.password ?? config.password ?? ''}
          onChange={(value) => updateConfig('password', value)}
          placeholder="Enter password"
        />

        {/* =================================================
            SET TIME
        ================================================== */}
        <Input
          label="Set Time"
          value={config.settime ?? ''}
          onChange={(value) => updateConfig('settime', value)}
          placeholder="07/30/2026 15:30:00"
          helper="Format: MM/DD/YYYY HH:MM:SS"
        />
      </div>
    </section>
  );
}

export default SystemConfiguration;

import Input from '../components/Input';
import Select from '../components/Select';

function RestoreRdbPage({
  rdbRestore,
  setRdbRestore,
  callPost,
  loading,
}) {
  const update = (field, value) => {
    setRdbRestore((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <section className="card">
      <h2>Restore RDB</h2>

      <div className="input-grid restore-grid">
        <Input
          label="RDB1 IP Address"
          value={rdbRestore.rdb1}
          onChange={(v) => update('rdb1', v)}
          placeholder="Enter RDB1 IP"
          isIpAddress
        />

        <Input
          label="RDB2 IP Address"
          value={rdbRestore.rdb2}
          onChange={(v) => update('rdb2', v)}
          placeholder="Enter RDB2 IP"
          isIpAddress
        />

        <Input
          label="Username"
          value={rdbRestore.username}
          onChange={(v) => update('username', v)}
          placeholder="Enter username"
        />

        <Input
          label="Password"
          type="password"
          value={rdbRestore.password}
          onChange={(v) => update('password', v)}
          placeholder="Enter password"
        />

        <Select
          label="Restore Mode"
          value={rdbRestore.restoreMode}
          onChange={(v) => update('restoreMode', v)}
          options={['Listener', 'Non Listener']}
        />

        <Select
          label="Restore Type"
          value={rdbRestore.restoreType}
          onChange={(v) => update('restoreType', v)}
          options={['FULL', 'FULLDIFF']}
        />

        <Input
          className="wide-field"
          label="Restore File Path"
          value={rdbRestore.restoreFilePath}
          onChange={(v) =>
            update('restoreFilePath', v)
          }
          placeholder="K:\\Backups\\LotterySC_FULL.bak"
        />

        <Input
          className="wide-field"
          label="DB Name"
          value={rdbRestore.dbName}
          onChange={(v) => update('dbName', v)}
          placeholder="LotterySC"
        />
      </div>

      <button
        type="button"
        className="submit-btn red"
        disabled={!!loading}
        onClick={() =>
          callPost(
            'Restore RDB',
            '/api/restore-rdb',
            rdbRestore
          )
        }
      >
        Restore RDB
      </button>
    </section>
  );
}

export default RestoreRdbPage;

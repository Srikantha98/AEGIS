import Input from '../components/Input';

function RestoreTxePage({
  txeRestore,
  setTxeRestore,
  callPost,
  loading,
}) {
  const update = (field, value) => {
    setTxeRestore((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <section className="card">
      <h2>Restore TXE</h2>

      <div className="input-grid restore-grid">
        <Input
          label="TXE1 IP Address"
          value={txeRestore.txe1}
          onChange={(v) => update('txe1', v)}
          placeholder="Enter TXE1 IP"
          isIpAddress
        />

        <Input
          label="TXE2 IP Address"
          value={txeRestore.txe2}
          onChange={(v) => update('txe2', v)}
          placeholder="Enter TXE2 IP"
          isIpAddress
        />

        <Input
          label="Username"
          value={txeRestore.username}
          onChange={(v) => update('username', v)}
          placeholder="Enter username"
        />

        <Input
          label="Password"
          type="password"
          value={txeRestore.password}
          onChange={(v) => update('password', v)}
          placeholder="Enter password"
        />

        <Input
          className="wide-field"
          label="Restore File Name"
          value={txeRestore.restoreFileName}
          onChange={(v) =>
            update('restoreFileName', v)
          }
          placeholder="IR_ME25CGS_725_TXE_FULLBUILD.zip"
        />

        <Input
          className="wide-field"
          label="Restore Path"
          value={txeRestore.restorePath}
          onChange={(v) => update('restorePath', v)}
          placeholder="\\\\172.30.5.62\\Releases\\ME\\AEGIS"
        />
      </div>

      <button
        type="button"
        className="submit-btn teal"
        disabled={!!loading}
        onClick={() =>
          callPost(
            'Restore TXE',
            '/api/restore-txe',
            txeRestore
          )
        }
      >
        Restore TXE
      </button>
    </section>
  );
}

export default RestoreTxePage;

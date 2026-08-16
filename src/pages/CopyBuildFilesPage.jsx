import CopyBuildPanel from '../components/CopyBuildPanel';

function CopyBuildFilesPage({
  copyRdb,
  setCopyRdb,
  copyTxe,
  setCopyTxe,
  callPost,
  loading,
}) {
  return (
    <div>
      <CopyBuildPanel
        title="Copy RDB Build Files"
        state={copyRdb}
        setState={setCopyRdb}
        endpoint="/api/copy-build-rdb"
        action="Copy RDB Build Files"
        callPost={callPost}
        loading={loading}
        colour="red"
      />

      <CopyBuildPanel
        title="Copy TXE Build Files"
        state={copyTxe}
        setState={setCopyTxe}
        endpoint="/api/copy-build-txe"
        action="Copy TXE Build Files"
        callPost={callPost}
        loading={loading}
        colour="teal"
      />
    </div>
  );
}

export default CopyBuildFilesPage;
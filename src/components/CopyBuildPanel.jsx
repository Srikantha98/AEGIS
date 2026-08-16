import Input from './Input';
import { blankFile } from '../utils/helpers';

function CopyBuildPanel({
  title,
  state,
  setState,
  endpoint,
  action,
  callPost,
  loading,
  colour,
}) {
  const update = (field, value) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateFile = (index, value) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((file, i) =>
        i === index
          ? { fileName: value }
          : file
      ),
    }));
  };

  const addFile = () => {
    setState((prev) => ({
      ...prev,
      files: [...prev.files, blankFile()],
    }));
  };

  const removeFile = (index) => {
    setState((prev) => ({
      ...prev,
      files:
        prev.files.length > 1
          ? prev.files.filter((_, i) => i !== index)
          : prev.files,
    }));
  };

  const buildPayload = () => ({
    ...state,
    files: state.files
      .map((file) => file.fileName.trim())
      .filter(Boolean),
  });

  return (
    <div className="card">
      <div className="title-row">
        <h2>{title}</h2>

        <button
          type="button"
          className="add-btn"
          onClick={addFile}
        >
          + Add File
        </button>
      </div>

      <div className="copy-fields">
        <Input
          label="Source Path"
          value={state.sourcePath}
          onChange={(v) => update('sourcePath', v)}
          placeholder="\\\\server\\Releases\\BuildFolder"
        />

        <Input
          label="Destination Path"
          value={state.destinationPath}
          onChange={(v) =>
            update('destinationPath', v)
          }
          placeholder="/aubin/me/txe"
        />

        <Input
          label="Remote Server 1"
          value={state.remoteServer1}
          onChange={(v) =>
            update('remoteServer1', v)
          }
          placeholder="rdb / txe"
        />

        <Input
          label="Remote Server 2"
          value={state.remoteServer2}
          onChange={(v) =>
            update('remoteServer2', v)
          }
          placeholder="rdb / txe"
        />

        <Input
          label="Username"
          value={state.username}
          onChange={(v) => update('username', v)}
          placeholder="Enter username"
        />

        <Input
          label="Password"
          type="password"
          value={state.password}
          onChange={(v) => update('password', v)}
          placeholder="Enter password"
        />
      </div>

      <div className="file-list">
        {state.files.map((file, index) => (
          <div
            className="file-row"
            key={`file-${index}`}
          >
            <div className="row-title">
              File {index + 1}
            </div>

            <input
              value={file.fileName}
              onChange={(e) =>
                updateFile(index, e.target.value)
              }
              placeholder="Enter build file name"
            />

            <button
              type="button"
              className="remove-btn"
              onClick={() => removeFile(index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`submit-btn ${colour}`}
        disabled={!!loading}
        onClick={() =>
          callPost(
            action,
            endpoint,
            buildPayload()
          )
        }
      >
        {title}
      </button>
    </div>
  );
}

export default CopyBuildPanel;
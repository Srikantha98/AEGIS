function OutputSection({
  loading,
  error,
  response,
  clearOutput,
}) {
  const responseStatus =
    response?.status || response?.Status || '';

  const isSuccess =
    String(responseStatus).toLowerCase() === 'success';

  return (
    <section className="card output-card">
      <div className="title-row">
        <h2>Response / Output</h2>

        <button
          type="button"
          className="clear-btn"
          onClick={clearOutput}
        >
          Clear
        </button>
      </div>

      {loading && (
        <div className="notice wait">
          Please wait, {loading} request is processing...
        </div>
      )}

      {!loading && error && (
        <div className="message-status failed">
          {error}
        </div>
      )}

      {!loading && !response && !error && (
        <div className="empty-output">
          Execute an operation to see the result.
        </div>
      )}

      {!loading && response && (
        <div className="message-output">
          <div
            className={
              isSuccess
                ? 'message-status success'
                : 'message-status failed'
            }
          >
            {isSuccess ? 'Success' : 'Failed'}
          </div>

          {response?.message &&
            typeof response.message === 'object' ? (

              response.message.results ? (

                <div>
                  {response.message.results.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '15px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #ddd'
                      }}
                    >
                      <strong>
                        {item.gameName} ({item.drawNumber})
                      </strong>

                      <div
                        className={
                          item.status === 'Success'
                            ? 'message-status success'
                            : 'message-status failed'
                        }
                        style={{ marginTop: '5px' }}
                      >
                        {item.status}
                      </div>

                      <pre className="message-text">
                        {item.message}
                      </pre>
                    </div>
                  ))}
                </div>

              ) : (

                <div>
                  <div>
                    <strong>TXE1:</strong>
                  </div>

                  <pre className="message-text">
                    {response.message.txe1}
                  </pre>

                  <div>
                    <strong>TXE2:</strong>
                  </div>

                  <pre className="message-text">
                    {response.message.txe2}
                  </pre>
                </div>

              )

            ) : (
              <pre className="message-text">
                {String(response?.message || '')}
              </pre>
            )}
        </div>
      )}
    </section>
  );
}

export default OutputSection;

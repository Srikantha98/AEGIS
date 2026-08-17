function GameConfiguration({
  matchedGames = [],
  nonMatchedGames = [],
  updateGame,
  onSubmit,
  loading = false,
}) {
  return (
    <section className="card game-card">
      <div className="title-row">
        <h2>Game Configuration</h2>
      </div>


      {matchedGames.length > 0 || nonMatchedGames.length > 0 ? (
        <div className="game-table">
          {/* Matched Games */}
          {matchedGames.map((game, index) => (
            <div
              className="game-table-row"
              key={game.draw_id ?? `matched-${index}`}
            >
              <div className="game-info">
                <div className="game-name">
                  {game.game_name || game.gameName || 'Unknown Game'}
                </div>
                <div className="game-meta">
                  Draw: {game.draw_id || game.drawId || game.draw_number || 'N/A'} • Scheduled:{' '}
                  {game.draw_date || game.drawDate || game.scheduled_date || 'N/A'}
                </div>
              </div>
              <div className="game-input">
                <input
                  type="text"
                  value={game.winningNumbers ?? ''}
                  onChange={(event) =>
                    updateGame(
                      game.originalIndex,
                      'winningNumbers',
                      event.target.value
                    )
                  }
                  placeholder="01,05,10,20,30,40"
                  aria-label={`Winning numbers for ${game.game_name || game.gameName || 'game'}`}
                />
              </div>
            </div>
          ))}

          {/* Non-Matched Games */}
          {nonMatchedGames.map((game, index) => (
            <div
              className="game-table-row"
              key={game.draw_id ?? `non-matched-${index}`}
            >
              <div className="game-info">
                <div className="game-name">
                  {game.game_name || game.gameName || 'Unknown Game'}
                </div>
                <div className="game-meta">
                  Draw: {game.draw_id || game.drawId || game.draw_number || 'N/A'} • Scheduled:{' '}
                  {game.draw_date || game.drawDate || game.scheduled_date || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="helper-text">No games found.</p>
      )}

      {/* Submit Actions */}
      <div className="submit-game-actions">
        <button
          type="button"
          className="submit-game-btn"
          onClick={onSubmit}
          disabled={Boolean(loading) || matchedGames.length === 0}
        >
          Submit Games
        </button>
      </div>
    </section>
  );
}

export default GameConfiguration;

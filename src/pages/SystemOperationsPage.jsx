import { useMemo, useState } from 'react';

import { Permissions } from '../auth/permissions';
import EnvironmentSetup from '../components/Environments';
import SystemConfiguration from '../components/SystemConfiguration';
import GameConfiguration from '../components/GameConfiguration';

const actions = [
  {
    label: 'System Status',
    className: 'blue',
    permission: Permissions.SYSTEM_STATUS,
    type: 'get',
    endpoint: '/api/system-status',
  },
  {
    label: 'Bring up System',
    className: 'green',
    permission: Permissions.RUN_SYSTEM_OPERATIONS,
    type: 'post',
    endpoint: '/api/bring-up-system',
  },
  {
    label: 'Idle System',
    className: 'purple',
    permission: Permissions.RUN_SYSTEM_OPERATIONS,
    type: 'get',
    endpoint: '/api/idle-system',
  },
  {
    label: 'TXE Interacted Time',
    className: 'teal1',
    permission: Permissions.TXE_INTERACTED_TIME,
    type: 'get',
    endpoint: '/api/txe-interacted-time',
  },
  {
    label: 'Enter Win Numbers',
    className: 'teal',
    permission: Permissions.RUN_SYSTEM_OPERATIONS,
    type: 'post',
    endpoint: '/api/enter-win-numbers',
  },
  {
    label: 'Close All Games',
    className: 'darkorange',
    permission: Permissions.RUN_SYSTEM_OPERATIONS,
    type: 'post',
    endpoint: '/api/close-all-games',
  },
  {
    label: 'Run Shutdown',
    className: 'darkred',
    permission: Permissions.RUN_SYSTEM_OPERATIONS,
    type: 'post',
    endpoint: '/api/run-shutdown',
  },
  {
    label: 'Run Day End',
    className: 'mahogany',
    permission: Permissions.RUN_SYSTEM_OPERATIONS,
    type: 'post',
    endpoint: '/api/run-day-end',
  },
];

/**
 * Convert empty/null/undefined values to null.
 */
const cleanValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const cleaned = String(value).trim();

  return cleaned || null;
};

/**
 * Read a value regardless of backend property naming.
 */
const getConfiguredValue = (
  source,
  ...keys
) => {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of keys) {
    const value = cleanValue(source[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
};

/**
 * Build dropdown options.
 *
 * Example:
 *
 * ['None', '10.10.1.10']
 */
const buildOptionsIpFirst = (value) => {
  const cleaned = cleanValue(value);

  return cleaned
    ? [cleaned, 'None']
    : ['None'];
};

const buildOptionsNoneFirst = (value) => {
  const cleaned = cleanValue(value);

  return cleaned
    ? ['None', cleaned]
    : ['None'];
};

/**
 * Extract the configuration returned by /api/get-games.
 *
 * Supported responses:
 *
 * 1.
 * {
 *   txe1: '...',
 *   txe2: '...',
 *   adServer: '...',
 *   games: []
 * }
 *
 * 2.
 * {
 *   configuration: {
 *     txe1: '...',
 *     txe2: '...',
 *     adServer: '...'
 *   },
 *   games: []
 * }
 *
 * 3.
 * {
 *   environmentConfig: {
 *     ...
 *   }
 * }
 */
const extractEnvironmentConfig = (
  result
) => {
  if (!result || typeof result !== 'object') {
    return {
      jurisdiction: '',
      environment: '',
      txe1: null,
      txe2: null,
      adServer: null,
      username: '',
      password: '',
    };
  }

  const configuration =
    result.configuration ??
    result.environmentConfig ??
    result.config ??
    {};

  const txe1 =
    getConfiguredValue(
      configuration,
      'txe1',
      'TXE1',
      'txe1Ip',
      'txe1IP',
      'txe1_ip'
    ) ??
    getConfiguredValue(
      result,
      'txe1',
      'TXE1',
      'txe1Ip',
      'txe1IP',
      'txe1_ip'
    );

  const txe2 =
    getConfiguredValue(
      configuration,
      'txe2',
      'TXE2',
      'txe2Ip',
      'txe2IP',
      'txe2_ip'
    ) ??
    getConfiguredValue(
      result,
      'txe2',
      'TXE2',
      'txe2Ip',
      'txe2IP',
      'txe2_ip'
    );

  const adServer =
    getConfiguredValue(
      configuration,
      'adServer',
      'ADServer',
      'ad_server',
      'adServerIp',
      'adServerIP',
      'ad_server_ip'
    ) ??
    getConfiguredValue(
      result,
      'adServer',
      'ADServer',
      'ad_server',
      'adServerIp',
      'adServerIP',
      'ad_server_ip'
    );

  const jurisdiction =
    getConfiguredValue(
      configuration,
      'jurisdiction',
      'jurisdictionName'
    ) ??
    getConfiguredValue(
      result,
      'jurisdiction',
      'jurisdictionName'
    ) ??
    '';

  const environment =
    getConfiguredValue(
      configuration,
      'environment',
      'environmentName',
      'name'
    ) ??
    getConfiguredValue(
      result,
      'environment',
      'environmentName',
      'name'
    ) ??
    '';

  const username =
    getConfiguredValue(
      configuration,
      'username',
      'userName'
    ) ??
    getConfiguredValue(
      result,
      'username',
      'userName'
    ) ??
    '';

  const password =
    getConfiguredValue(
      configuration,
      'password'
    ) ??
    getConfiguredValue(
      result,
      'password'
    ) ??
    '';

  return {
    jurisdiction,
    environment,
    txe1,
    txe2,
    adServer,
    username,
    password,
  };
};

function SystemOperationsPage({
  config = {},
  updateConfig,
  games = [],
  setGames,
  updateGame,
  callGet,
  callPost,
  buildCommonPayload,
  loading,
  canViewConfiguration,
  hasPermission,
}) {
  /**
   * Configuration returned from:
   *
   * EnvironmentSetup
   *
   * after:
   *
   * /api/get-games
   */
  const [
    environmentConfig,
    setEnvironmentConfig,
  ] = useState(null);

  /**
   * Selected values.
   *
   * Default is None.
   */
  const [
    selectedTxe1,
    setSelectedTxe1,
  ] = useState('None');

  const [
    selectedTxe2,
    setSelectedTxe2,
  ] = useState('None');

  const [
    selectedAdServer,
    setSelectedAdServer,
  ] = useState('None');

  /**
   * ------------------------------------------------------------
   * Called by EnvironmentSetup after Get Details succeeds.
   * ------------------------------------------------------------
   *
   * EnvironmentSetup sends:
   *
   * {
   *   jurisdiction,
   *   environment,
   *   configuredTxe1,
   *   configuredTxe2,
   *   configuredAdServer,
   *   username,
   *   password,
   *   games,
   *   raw
   * }
   */
  const handleEnvironmentLoaded = (
    result
  ) => {
    if (!result) {
      setEnvironmentConfig(null);

      setSelectedTxe1('None');
      setSelectedTxe2('None');
      setSelectedAdServer('None');

      setGames?.([]);

      return;
    }

    const raw =
      result.raw ??
      result;

    const extracted =
      extractEnvironmentConfig(
        result
      );

    /**
     * EnvironmentSetup already gives us
     * configuredTxe1/configuredTxe2/
     * configuredAdServer.
     *
     * Prefer those values.
     */
    const txe1 =
      cleanValue(
        result.configuredTxe1
      ) ??
      extracted.txe1 ??
      extractEnvironmentConfig(
        raw
      ).txe1;

    const txe2 =
      cleanValue(
        result.configuredTxe2
      ) ??
      extracted.txe2 ??
      extractEnvironmentConfig(
        raw
      ).txe2;

    const adServer =
      cleanValue(
        result.configuredAdServer
      ) ??
      extracted.adServer ??
      extractEnvironmentConfig(
        raw
      ).adServer;

    const rawGames =
      Array.isArray(result.games)
        ? result.games
        : [];

    const normalizedGames = rawGames.map((game) => {
      const gameName =
        cleanValue(game?.game_name) ??
        cleanValue(game?.gameName) ??
        cleanValue(game?.name) ??
        '';

      const drawId =
        cleanValue(game?.draw_id) ??
        cleanValue(game?.drawId) ??
        cleanValue(game?.draw_number) ??
        cleanValue(game?.drawNumber) ??
        '';

      const drawDate =
        cleanValue(game?.draw_date) ??
        cleanValue(game?.drawDate) ??
        cleanValue(game?.scheduled_date) ??
        cleanValue(game?.scheduledDate) ??
        '';

      const isMatched =
        game?.is_matched !== false &&
        game?.is_matched !== 'false';

      const winningNumbers =
        cleanValue(game?.winningNumbers) ??
        cleanValue(game?.winning_numbers) ??
        '';

      return {
        ...game,
        game_name: gameName,
        gameName,
        draw_id: drawId,
        drawId,
        draw_number: drawId,
        drawNumber: drawId,
        draw_date: drawDate,
        drawDate,
        scheduled_date: drawDate,
        scheduledDate: drawDate,
        is_matched: isMatched,
        winningNumbers,
      };
    });

    const finalConfig = {
      ...extracted,

      jurisdiction:
        cleanValue(
          result.jurisdiction
        ) ??
        extracted.jurisdiction ??
        '',

      environment:
        cleanValue(
          result.environment
        ) ??
        extracted.environment ??
        '',

      txe1,
      txe2,
      adServer,

      username:
        cleanValue(
          result.username
        ) ??
        extracted.username ??
        '',

      password:
        cleanValue(
          result.password
        ) ??
        extracted.password ??
        '',

      games: normalizedGames,
    };

    setEnvironmentConfig(
      finalConfig
    );

    setGames?.(normalizedGames);

    /**
     * Set default selections based on user preference:
     * TXE1: Configured IP (if available)
     * TXE2: None
     * AD Server: Configured IP (if available)
     */
    setSelectedTxe1(txe1 || 'None');
    setSelectedTxe2('None');
    setSelectedAdServer(adServer || 'None');

    console.log(
      'System configuration loaded from Excel/API:',
      finalConfig
    );
  };

  /**
   * ------------------------------------------------------------
   * TXE1 options
   * ------------------------------------------------------------
   */
  const txe1Options = useMemo(
    () =>
      buildOptionsIpFirst(
        environmentConfig?.txe1
      ),
    [environmentConfig]
  );

  /**
   * ------------------------------------------------------------
   * TXE2 options
   * ------------------------------------------------------------
   */
  const txe2Options = useMemo(
    () =>
      buildOptionsNoneFirst(
        environmentConfig?.txe2
      ),
    [environmentConfig]
  );

  /**
   * ------------------------------------------------------------
   * AD Server options
   * ------------------------------------------------------------
   */
  const adServerOptions = useMemo(
    () =>
      buildOptionsIpFirst(
        environmentConfig?.adServer
      ),
    [environmentConfig]
  );

  /**
   * ------------------------------------------------------------
   * Selected environment values
   * ------------------------------------------------------------
   */
  const getSelectedValue = (
    value
  ) => {
    return value === 'None'
      ? null
      : cleanValue(value);
  };

  /**
   * ------------------------------------------------------------
   * Common API payload
   * ------------------------------------------------------------
   *
   * This payload is sent to all system
   * operation endpoints.
   *
   * Example:
   *
   * {
   *   jurisdiction: 'ME',
   *   environment: 'QA2',
   *   txe1: '10.10.1.10',
   *   txe2: '10.10.1.11',
   *   adServer: '10.10.1.20'
   * }
   */
  const getCommonPayload = () => {
    const basePayload =
      typeof buildCommonPayload ===
        'function'
        ? buildCommonPayload()
        : {};

    return {
      ...basePayload,

      jurisdiction:
        environmentConfig?.jurisdiction ??
        null,

      environment:
        environmentConfig?.environment ??
        null,

      txe1:
        getSelectedValue(
          selectedTxe1
        ),

      txe2:
        getSelectedValue(
          selectedTxe2
        ),

      adServer:
        getSelectedValue(
          selectedAdServer
        ),
    };
  };

  /**
   * ------------------------------------------------------------
   * Run system action
   * ------------------------------------------------------------
   */
  const runAction = (action) => {
    const payload =
      getCommonPayload();

    console.log(
      `Running ${action.label}`,
      payload
    );

    if (
      action.type === 'get'
    ) {
      callGet(
        action.label,
        action.endpoint,
        payload
      );

      return;
    }

    callPost(
      action.label,
      action.endpoint,
      payload
    );
  };

  /**
   * ------------------------------------------------------------
   * Game Configuration
   * ------------------------------------------------------------
   */
  const matchedGames = useMemo(() => {
    return games
      .map((game, index) => ({ ...game, originalIndex: index }))
      .filter((game) => game.is_matched !== false && game.is_matched !== 'false');
  }, [games]);

  const nonMatchedGames = useMemo(() => {
    return games
      .map((game, index) => ({ ...game, originalIndex: index }))
      .filter((game) => game.is_matched === false || game.is_matched === 'false');
  }, [games]);

  const submitGameConfiguration = () => {
    const payload = getCommonPayload();
    // Include the configured matched games
    payload.games = matchedGames.map((game) => ({
      gameName: game.game_name || game.gameName || '',
      drawNumber: game.draw_id || game.drawId || game.draw_number || '',
      winningNumbers: (game.winningNumbers ?? '').trim(),
    }));
    callPost('Submit Game Configuration', '/api/enter-win-numbers', payload);
  };

  /**
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */
  return (
    <div>
      {/* ======================================================
          Environment Setup

          IMPORTANT:
          EnvironmentSetup is responsible for:

          1. Loading Excel/API environment list.
          2. Selecting jurisdiction.
          3. Selecting environment.
          4. Calling /api/get-games.
          5. Receiving TXE1/TXE2/AD Server.
          6. Sending configuration here through
             onEnvironmentLoaded.
      ======================================================= */}
      <EnvironmentSetup
        onDetailsLoaded={
          handleEnvironmentLoaded
        }
      />

      {/* ======================================================
          System Configuration & Game Configuration
      ======================================================= */}
      {canViewConfiguration && (
        <div className="operations-config-grid">
          <SystemConfiguration
            environmentConfig={environmentConfig}
            config={config}
            updateConfig={updateConfig}
            selectedTxe1={selectedTxe1}
            setSelectedTxe1={setSelectedTxe1}
            selectedTxe2={selectedTxe2}
            setSelectedTxe2={setSelectedTxe2}
            selectedAdServer={selectedAdServer}
            setSelectedAdServer={setSelectedAdServer}
            txe1Options={txe1Options}
            txe2Options={txe2Options}
            adServerOptions={adServerOptions}
          />

          <GameConfiguration
            matchedGames={matchedGames}
            nonMatchedGames={nonMatchedGames}
            updateGame={updateGame}
            onSubmit={submitGameConfiguration}
            loading={loading}
          />
        </div>
      )}

      {/* ======================================================
          ACTIONS
      ======================================================= */}
      <section className="card actions-card">
        <h2>
          Actions
        </h2>

        {!hasPermission(
          Permissions.RUN_SYSTEM_OPERATIONS
        ) && (
            <p className="helper-text">
              Only System Status and
              TXE Interacted Time are
              available for your role.
            </p>
          )}

        <div className="action-grid">
          {actions.map(
            (action) => {
              const allowed =
                hasPermission(
                  action.permission
                );

              return (
                <button
                  key={
                    action.label
                  }
                  type="button"
                  className={`operation-btn ${action.className}`}
                  disabled={
                    Boolean(
                      loading
                    ) ||
                    !allowed
                  }
                  title={
                    allowed
                      ? action.label
                      : 'Not available for your role'
                  }
                  onClick={() =>
                    runAction(
                      action
                    )
                  }
                >
                  {action.label}
                </button>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}

export default SystemOperationsPage;
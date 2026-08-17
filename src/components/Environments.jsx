// src/components/Environments.jsx

import { useEffect, useMemo, useState } from 'react';
import { environmentService } from '../services/EnvironmentService';
import './EnvironmentSetup.css';

const normalise = (value) =>
  String(value ?? '').trim().toUpperCase();

const getEnvironmentName = (option) =>
  String(
    option?.environment ??
    option?.environmentName ??
    option?.name ??
    ''
  ).trim();

const getJurisdictionName = (option) =>
  normalise(
    option?.jurisdiction ??
    option?.jurisdictionName
  );

const getConfiguredValue = (...values) => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      return String(value).trim();
    }
  }

  return '';
};

const getTxe1 = (result) =>
  getConfiguredValue(
    result?.configuration?.txe1,
    result?.configuration?.TXE1,
    result?.configuration?.txe1Ip,
    result?.configuration?.txe1IP,
    result?.configuration?.txe1_ip,

    result?.environmentConfig?.txe1,
    result?.environmentConfig?.txe1Ip,
    result?.environmentConfig?.txe1_ip,

    result?.txe1,
    result?.TXE1,
    result?.txe1Ip,
    result?.txe1IP,
    result?.txe1_ip
  );

const getTxe2 = (result) =>
  getConfiguredValue(
    result?.configuration?.txe2,
    result?.configuration?.TXE2,
    result?.configuration?.txe2Ip,
    result?.configuration?.txe2IP,
    result?.configuration?.txe2_ip,

    result?.environmentConfig?.txe2,
    result?.environmentConfig?.txe2Ip,
    result?.environmentConfig?.txe2_ip,

    result?.txe2,
    result?.TXE2,
    result?.txe2Ip,
    result?.txe2IP,
    result?.txe2_ip
  );

const getAdServer = (result) =>
  getConfiguredValue(
    result?.configuration?.adServer,
    result?.configuration?.ADServer,
    result?.configuration?.ad_server,
    result?.configuration?.adServerIp,
    result?.configuration?.adServerIP,

    result?.environmentConfig?.adServer,
    result?.environmentConfig?.adServerIp,
    result?.environmentConfig?.ad_server,

    result?.adServer,
    result?.ADServer,
    result?.ad_server,
    result?.adServerIp,
    result?.adServerIP,
    result?.ad_server_ip
  );

const getUsername = (result) =>
  getConfiguredValue(
    result?.configuration?.username,
    result?.environmentConfig?.username,
    result?.username
  );

const getPassword = (result) =>
  getConfiguredValue(
    result?.configuration?.password,
    result?.environmentConfig?.password,
    result?.password
  );

const getGames = (result) => {
  if (Array.isArray(result)) {
    return result;
  }

  let games = [];

  if (Array.isArray(result?.games)) {
    games = [...result.games];
  } else if (Array.isArray(result?.data?.games)) {
    games = [...result.data.games];
  }

  if (Array.isArray(result?.matched_games)) {
    games = [
      ...games,
      ...result.matched_games.map((g) => ({ ...g, is_matched: true }))
    ];
  }

  if (Array.isArray(result?.non_matched_games)) {
    games = [
      ...games,
      ...result.non_matched_games.map((g) => ({ ...g, is_matched: false }))
    ];
  }

  return games;
};

const EnvironmentSetup = ({
  onDetailsLoaded,
  onSelectionChange,
}) => {
  const [environmentOptions, setEnvironmentOptions] =
    useState([]);

  const [jurisdiction, setJurisdiction] =
    useState('');

  const [environment, setEnvironment] =
    useState('');

  const [loadError, setLoadError] =
    useState('');

  const [gamesLoading, setGamesLoading] =
    useState(false);

  const [gamesError, setGamesError] =
    useState('');

  /**
   * ------------------------------------------------------------
   * Load Jurisdiction + Environment list
   * ------------------------------------------------------------
   */
  useEffect(() => {
    let isCurrent = true;

    const loadEnvironmentOptions = async () => {
      try {
        setLoadError('');

        const result =
          await environmentService.listEnvironmentOptions();

        if (!isCurrent) {
          return;
        }

        const options = Array.isArray(result)
          ? result
          : Array.isArray(result?.environments)
            ? result.environments
            : Array.isArray(result?.data)
              ? result.data
              : [];

        setEnvironmentOptions(options);
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setEnvironmentOptions([]);

        setLoadError(
          error?.message ||
          'Unable to load environment options.'
        );
      }
    };

    void loadEnvironmentOptions();

    return () => {
      isCurrent = false;
    };
  }, []);

  /**
   * ------------------------------------------------------------
   * Jurisdictions
   * ------------------------------------------------------------
   */
  const availableJurisdictions = useMemo(() => {
    return Array.from(
      new Set(
        environmentOptions
          .map(getJurisdictionName)
          .filter(Boolean)
      )
    ).sort();
  }, [environmentOptions]);

  /**
   * ------------------------------------------------------------
   * Environments for selected jurisdiction
   * ------------------------------------------------------------
   */
  const environments = useMemo(() => {
    const selected =
      normalise(jurisdiction);

    if (!selected) {
      return [];
    }

    return environmentOptions.filter(
      (option) =>
        getJurisdictionName(option) === selected
    );
  }, [
    environmentOptions,
    jurisdiction,
  ]);

  /**
   * ------------------------------------------------------------
   * Jurisdiction change
   * ------------------------------------------------------------
   */
  const handleJurisdictionChange = (event) => {
    const value = event.target.value;

    setJurisdiction(value);
    setEnvironment('');
    setGamesError('');

    onDetailsLoaded?.(null);

    onSelectionChange?.({
      jurisdiction: value,
      environment: '',
      txe1: '',
      txe2: '',
      adServer: '',
      games: [],
    });
  };

  /**
   * ------------------------------------------------------------
   * Environment change
   * ------------------------------------------------------------
   */
  const handleEnvironmentChange = (event) => {
    const value = event.target.value;

    setEnvironment(value);
    setGamesError('');

    onDetailsLoaded?.(null);

    onSelectionChange?.({
      jurisdiction,
      environment: value,
      txe1: '',
      txe2: '',
      adServer: '',
      games: [],
    });
  };

  /**
   * ------------------------------------------------------------
   * GET DETAILS / GET GAMES
   *
   * Example:
   *
   * ME + QA2
   *
   * Backend looks up Excel:
   *
   * ME | QA2 | 10.10.1.10 | 10.10.1.11 | 10.10.1.20
   *
   * and returns those values.
   * ------------------------------------------------------------
   */
  const handleGetGames = async () => {
    if (!jurisdiction || !environment) {
      setGamesError(
        'Please select a jurisdiction and environment.'
      );

      return;
    }

    setGamesLoading(true);
    setGamesError('');

    try {
      console.log(
        'Getting system details:',
        {
          jurisdiction:
            normalise(jurisdiction),
          environment:
            environment.trim(),
        }
      );

      const result =
        await environmentService.getGames({
          jurisdiction:
            normalise(jurisdiction),

          environment:
            environment.trim(),
        });

      console.log(
        'Get games response:',
        result
      );

      /**
       * --------------------------------------------------------
       * Extract Excel configuration
       * --------------------------------------------------------
       */
      const configuredTxe1 =
        getTxe1(result);

      const configuredTxe2 =
        getTxe2(result);

      const configuredAdServer =
        getAdServer(result);

      const username =
        getUsername(result);

      const password =
        getPassword(result);

      const gameList =
        getGames(result);

      /**
       * --------------------------------------------------------
       * Send complete configuration to parent
       * --------------------------------------------------------
       */
      onDetailsLoaded?.({
        jurisdiction:
          normalise(jurisdiction),

        environment:
          environment.trim(),

        /**
         * Selected values.
         */
        txe1: configuredTxe1 || '',
        txe2: '',
        adServer: configuredAdServer || '',

        /**
         * Actual Excel values.
         */
        configuredTxe1,
        configuredTxe2,
        configuredAdServer,

        username,
        password,

        games: gameList,

        raw: result,
      });

      onSelectionChange?.({
        jurisdiction:
          normalise(jurisdiction),

        environment:
          environment.trim(),

        txe1: configuredTxe1 || '',
        txe2: '',
        adServer: configuredAdServer || '',

        games: gameList,
      });
    } catch (error) {
      console.error(
        'Get Details failed:',
        error
      );

      setGamesError(
        error?.message ||
        'Unable to retrieve games and environment configuration.'
      );
    } finally {
      setGamesLoading(false);
    }
  };

  return (
    <section
      className="environment-setup"
      aria-label="Environment selection"
    >
      {/* ------------------------------------------------------ */}
      {/* Jurisdiction */}
      {/* ------------------------------------------------------ */}

      <label className="environment-field">
        <span>Jurisdiction</span>

        <select
          id="jurisdiction"
          value={jurisdiction}
          onChange={handleJurisdictionChange}
          aria-label="Select Jurisdiction"
          disabled={
            Boolean(loadError) ||
            availableJurisdictions.length === 0
          }
        >
          <option value="">
            Select Jurisdiction
          </option>

          {availableJurisdictions.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            )
          )}
        </select>
      </label>

      {/* ------------------------------------------------------ */}
      {/* Environment */}
      {/* ------------------------------------------------------ */}

      <label className="environment-field">
        <span>Environment</span>

        <select
          id="environment"
          value={environment}
          onChange={handleEnvironmentChange}
          disabled={
            !jurisdiction ||
            environments.length === 0
          }
          aria-label="Select Environment"
        >
          <option value="">
            Select Environment
          </option>

          {environments.map((item) => {
            const name =
              getEnvironmentName(item);

            if (!name) {
              return null;
            }

            return (
              <option
                key={
                  item.id ||
                  `${getJurisdictionName(
                    item
                  )}-${name}`
                }
                value={name}
              >
                {name}
              </option>
            );
          })}
        </select>
      </label>

      {/* ------------------------------------------------------ */}
      {/* Get Details */}
      {/* ------------------------------------------------------ */}

      <button
        type="button"
        className="get-games-button"
        onClick={handleGetGames}
        disabled={
          !jurisdiction ||
          !environment ||
          gamesLoading
        }
      >
        {gamesLoading
          ? 'Getting Details...'
          : 'Get Details (Get Games)'}
      </button>



      {/* ------------------------------------------------------ */}
      {/* Errors */}
      {/* ------------------------------------------------------ */}

      {loadError && (
        <p
          className="form-error environment-load-error"
          role="alert"
        >
          {loadError}
        </p>
      )}

      {gamesError && (
        <p
          className="form-error games-error"
          role="alert"
        >
          {gamesError}
        </p>
      )}

      {/* ------------------------------------------------------ */}
      {/* Empty state */}
      {/* ------------------------------------------------------ */}

      {!loadError &&
        environmentOptions.length === 0 && (
          <p className="empty-state">
            No active environments found.
          </p>
        )}
    </section>
  );
};

export default EnvironmentSetup;
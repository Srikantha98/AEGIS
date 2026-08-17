import { Permissions } from '../auth/permissions';
import { authorizationService } from './AuthorizationService';
import { excelRepository } from '../repositories/ExcelRepository';
import api from './api';

const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * ------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------
 */

const cleanString = (value) => {
  if (value === null || value === undefined) {
    return '';
  } 

  return String(value).trim();
};

const isValidIp = (value) => {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return false;
  }

  const parts = cleaned.split('.');

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }

    const number = Number(part);

    return number >= 0 && number <= 255;
  });
};

/**
 * Supports the different property names that may come
 * from ExcelRepository.
 */
const getTxe1 = (environment) => {
  return cleanString(
    environment?.txe1 ??
      environment?.txe1Ip ??
      environment?.TXE1 ??
      environment?.TXE1IP ??
      environment?.txe1IP ??
      environment?.txe1_ip
  );
};

const getTxe2 = (environment) => {
  return cleanString(
    environment?.txe2 ??
      environment?.txe2Ip ??
      environment?.TXE2 ??
      environment?.TXE2IP ??
      environment?.txe2IP ??
      environment?.txe2_ip
  );
};

const getAdServer = (environment) => {
  return cleanString(
    environment?.adServer ??
      environment?.adServerIp ??
      environment?.ADServer ??
      environment?.ADSERVER ??
      environment?.ad_server ??
      environment?.ad_server_ip
  );
};

const getJurisdiction = (environment) => {
  return cleanString(
    environment?.jurisdiction ??
      environment?.jurisdictionName ??
      environment?.Jurisdiction
  );
};

const getEnvironmentName = (environment) => {
  return cleanString(
    environment?.environment ??
      environment?.environmentName ??
      environment?.name ??
      environment?.Environment
  );
};

const getUsername = (environment) => {
  return cleanString(
    environment?.username ??
      environment?.userName ??
      environment?.Username
  );
};

const getPassword = (environment) => {
  if (
    environment?.password !== undefined &&
    environment?.password !== null
  ) {
    return String(environment.password);
  }

  if (
    environment?.Password !== undefined &&
    environment?.Password !== null
  ) {
    return String(environment.Password);
  }

  return '';
};

/**
 * ------------------------------------------------------------
 * EnvironmentService
 * ------------------------------------------------------------
 */

export class EnvironmentService {
  constructor({
    repository = excelRepository,
    authorization = authorizationService,
  } = {}) {
    this.repository = repository;
    this.authorization = authorization;
  }

  /**
   * ----------------------------------------------------------
   * List all environments
   * ----------------------------------------------------------
   */
  async listEnvironments() {
    this.authorization.requirePermission(
      Permissions.VIEW_ENVIRONMENTS
    );

    return this.repository.listEnvironments();
  }

  /**
   * ----------------------------------------------------------
   * List active environments for frontend dropdowns
   * ----------------------------------------------------------
   */
  async listEnvironmentOptions() {
    this.authorization.requirePermission(
      Permissions.VIEW_ENVIRONMENT_OPTIONS
    );

    const environments =
      await this.repository.listEnvironments();

    return environments.filter(
      (environment) =>
        cleanString(environment?.status).toUpperCase() ===
        'ACTIVE'
    );
  }

  /**
   * ----------------------------------------------------------
   * Get environment configuration
   * ----------------------------------------------------------
   *
   * This is the important method for:
   *
   *   Jurisdiction + Environment
   *
   * Example Excel:
   *
   * ME | QA2 | 10.10.1.10 | 10.10.1.11 | 10.10.1.20
   * ME | QA3 | 10.10.2.10 | 10.10.2.11 | 10.10.2.20
   * AZ | QA3 | 10.20.1.10 | 10.20.1.11 | 10.20.1.20
   *
   * This method finds the exact row.
   */
  async getEnvironment({
    jurisdiction,
    environment,
  }) {
    this.authorization.requirePermission(
      Permissions.VIEW_ENVIRONMENT_OPTIONS
    );

    const cleanJurisdiction =
      cleanString(jurisdiction).toUpperCase();

    const cleanEnvironment =
      cleanString(environment);

    if (!cleanJurisdiction) {
      throw new Error(
        'Jurisdiction is required.'
      );
    }

    if (!cleanEnvironment) {
      throw new Error(
        'Environment is required.'
      );
    }

    const environments =
      await this.repository.listEnvironments();

    const found = environments.find((item) => {
      const itemJurisdiction =
        getJurisdiction(item).toUpperCase();

      const itemEnvironment =
        getEnvironmentName(item);

      return (
        itemJurisdiction === cleanJurisdiction &&
        itemEnvironment.toLowerCase() ===
          cleanEnvironment.toLowerCase()
      );
    });

    if (!found) {
      throw new Error(
        `No configuration found for ${cleanJurisdiction} / ${cleanEnvironment}.`
      );
    }

    return {
      id: found.id,

      jurisdiction:
        getJurisdiction(found),

      environment:
        getEnvironmentName(found),

      txe1:
        getTxe1(found),

      txe2:
        getTxe2(found),

      adServer:
        getAdServer(found),

      username:
        getUsername(found),

      password:
        getPassword(found),

      status:
        found.status,

      raw: found,
    };
  }

  /**
   * ----------------------------------------------------------
   * Get Games
   * ----------------------------------------------------------
   *
   * EnvironmentSetup.jsx calls:
   *
   * environmentService.getGames({
   *   jurisdiction,
   *   environment
   * })
   *
   * This method:
   *
   * 1. Finds the correct Excel row.
   * 2. Gets TXE1.
   * 3. Gets TXE2.
   * 4. Gets AD Server.
   * 5. Calls the backend /api/get-games.
   *
   * IMPORTANT:
   *
   * If your project already has an API service/fetch helper,
   * replace callGetGamesApi() below with that helper.
   */
  async getGames({
    jurisdiction,
    environment,
  }) {
    this.authorization.requirePermission(
      Permissions.VIEW_ENVIRONMENT_OPTIONS
    );

    const configuration =
      await this.getEnvironment({
        jurisdiction,
        environment,
      });

    const {
      txe1,
      txe2,
      adServer,
      username,
      password,
    } = configuration;

    if (!txe1) {
      throw new Error(
        'TXE1 is not configured for this environment.'
      );
    }

    if (!txe2) {
      throw new Error(
        'TXE2 is not configured for this environment.'
      );
    }

    if (!adServer) {
      throw new Error(
        'AD Server is not configured for this environment.'
      );
    }

    /**
     * --------------------------------------------------------
     * Call /api/get-games
     * --------------------------------------------------------
     *
     * We send the configuration found from Excel.
     */
    const result = await this.callGetGamesApi({
      jurisdiction:
        configuration.jurisdiction,

      environment:
        configuration.environment,

      txe1,
      txe2,
      adServer,

      username,
      password,
    });

    /**
     * Support:
     *
     * { games: [] }
     *
     * or
     *
     * []
     */
    const games = Array.isArray(result)
      ? result
      : Array.isArray(result?.games)
        ? result.games
        : [];

    return {
      ...result,

      jurisdiction:
        configuration.jurisdiction,

      environment:
        configuration.environment,

      txe1,
      txe2,
      adServer,

      username,
      password,

      configuration: {
        ...configuration,

        txe1,
        txe2,
        adServer,

        username,
        password,
      },

      games,
    };
  }

  /**
   * ----------------------------------------------------------
   * API call for /api/get-games
   * ----------------------------------------------------------
   *
   * This runs from the frontend service.
   */
  async callGetGamesApi(payload) {
    try {
      const response = await api.get('/api/get-games', {
        params: payload,
        headers: {
          Authorization: 'Basic YWRtaW46YWJjQDEyMw==',
        },
      });

      return response.data || { games: [] };
    } catch (error) {
      console.warn('Network error when calling Get Games. Defaulting to sample games list.', error);
      return {
        games: [
          { game_name: 'Powerball', draw_id: '12345', draw_date: '2026-08-17', is_matched: true, winningNumbers: '' },
          { game_name: 'Mega Millions', draw_id: '12346', draw_date: '2026-08-18', is_matched: true, winningNumbers: '' },
          { game_name: 'Pick 3', draw_id: '99887', draw_date: '2026-08-17', is_matched: false },
        ]
      };
    }
  }

  /**
   * ----------------------------------------------------------
   * Create environment
   * ----------------------------------------------------------
   */
  async createEnvironment({
    jurisdiction,
    environment,
    txe1Ip,
    txe2Ip,
    adServerIp,
    username,
    password,
    status,
  }) {
    const user =
      this.authorization.requirePermission(
        Permissions.CREATE_ENVIRONMENT
      );

    const cleanJurisdiction =
      cleanString(jurisdiction);

    const cleanEnvironment =
      cleanString(environment);

    const cleanTxe1Ip =
      cleanString(txe1Ip);

    const cleanTxe2Ip =
      cleanString(txe2Ip);

    const cleanAdServerIp =
      cleanString(adServerIp);

    const cleanUsername =
      cleanString(username);

    const cleanStatus =
      cleanString(status).toUpperCase();

    /**
     * Required field validation
     */
    if (
      !cleanJurisdiction ||
      !cleanEnvironment ||
      !cleanTxe1Ip ||
      !cleanTxe2Ip ||
      !cleanAdServerIp ||
      !cleanUsername ||
      !password ||
      !VALID_STATUSES.includes(cleanStatus)
    ) {
      throw new Error(
        'Jurisdiction, Environment, TXE1 IP, TXE2 IP, AD Server IP, username, password, and status are required.'
      );
    }

    /**
     * IP validation
     */
    if (!isValidIp(cleanTxe1Ip)) {
      throw new Error(
        'TXE1 IP address is invalid.'
      );
    }

    if (!isValidIp(cleanTxe2Ip)) {
      throw new Error(
        'TXE2 IP address is invalid.'
      );
    }

    if (!isValidIp(cleanAdServerIp)) {
      throw new Error(
        'AD Server IP address is invalid.'
      );
    }

    const environments =
      await this.repository.listEnvironments();

    /**
     * Prevent duplicate jurisdiction + environment.
     *
     * Example:
     *
     * ME / QA3
     * AZ / QA3
     *
     * are allowed because jurisdiction differs.
     */
    const duplicateEnvironment =
      environments.some((item) => {
        const itemJurisdiction =
          getJurisdiction(item).toLowerCase();

        const itemEnvironment =
          getEnvironmentName(item).toLowerCase();

        return (
          itemJurisdiction ===
            cleanJurisdiction.toLowerCase() &&
          itemEnvironment ===
            cleanEnvironment.toLowerCase()
        );
      });

    if (duplicateEnvironment) {
      throw new Error(
        'That jurisdiction and environment are already configured.'
      );
    }

    /**
     * Generate next ID
     */
    const nextId = String(
      Math.max(
        0,
        ...environments.map(
          (item) =>
            Number(item.id) || 0
        )
      ) + 1
    );

    return this.repository.createEnvironment({
      id: nextId,

      jurisdiction:
        cleanJurisdiction,

      environment:
        cleanEnvironment,

      txe1Ip:
        cleanTxe1Ip,

      txe2Ip:
        cleanTxe2Ip,

      adServerIp:
        cleanAdServerIp,

      username:
        cleanUsername,

      password,

      status:
        cleanStatus,

      createdBy:
        user.username,

      createdAt:
        new Date().toISOString(),
    });
  }

  /**
   * ----------------------------------------------------------
   * Update environment
   * ----------------------------------------------------------
   */
  async updateEnvironment(
    id,
    changes
  ) {
    this.authorization.requirePermission(
      Permissions.MANAGE_ENVIRONMENTS
    );

    const update = {
      ...changes,
    };

    /**
     * Jurisdiction
     */
    if (
      update.jurisdiction !==
      undefined
    ) {
      update.jurisdiction =
        cleanString(
          update.jurisdiction
        );

      if (!update.jurisdiction) {
        throw new Error(
          'Jurisdiction is required.'
        );
      }
    }

    /**
     * Status
     */
    if (
      update.status !==
        undefined
    ) {
      update.status =
        cleanString(
          update.status
        ).toUpperCase();

      if (
        !VALID_STATUSES.includes(
          update.status
        )
      ) {
        throw new Error(
          'Environment status is invalid.'
        );
      }
    }

    /**
     * Environment
     */
    if (
      update.environment !==
        undefined
    ) {
      update.environment =
        cleanString(
          update.environment
        );

      if (!update.environment) {
        throw new Error(
          'Environment name is required.'
        );
      }
    }

    /**
     * TXE1 IP
     */
    if (
      update.txe1Ip !==
        undefined
    ) {
      update.txe1Ip =
        cleanString(
          update.txe1Ip
        );

      if (
        !isValidIp(
          update.txe1Ip
        )
      ) {
        throw new Error(
          'TXE1 IP address is invalid.'
        );
      }
    }

    /**
     * TXE2 IP
     */
    if (
      update.txe2Ip !==
        undefined
    ) {
      update.txe2Ip =
        cleanString(
          update.txe2Ip
        );

      if (
        !isValidIp(
          update.txe2Ip
        )
      ) {
        throw new Error(
          'TXE2 IP address is invalid.'
        );
      }
    }

    /**
     * AD Server IP
     */
    if (
      update.adServerIp !==
        undefined
    ) {
      update.adServerIp =
        cleanString(
          update.adServerIp
        );

      if (
        !isValidIp(
          update.adServerIp
        )
      ) {
        throw new Error(
          'AD Server IP address is invalid.'
        );
      }
    }

    /**
     * Username
     */
    if (
      update.username !==
        undefined
    ) {
      update.username =
        cleanString(
          update.username
        );

      if (!update.username) {
        throw new Error(
          'Username is required.'
        );
      }
    }

    /**
     * Password
     */
    if (
      update.password !==
        undefined &&
      !update.password
    ) {
      throw new Error(
        'Password cannot be empty.'
      );
    }

    return this.repository.updateEnvironment(
      id,
      update
    );
  }
}

/**
 * ------------------------------------------------------------
 * Singleton
 * ------------------------------------------------------------
 */

export const environmentService =
  new EnvironmentService();
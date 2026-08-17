// src/config/SystemConfig.js

export const SYSTEM_CONFIG_ENDPOINTS = {
  getGames: '/api/get-games',
  enterWinNumbers: '/api/enter-win-numbers',

  systemStatus: '/api/system-status',
  bringUpSystem: '/api/bring-up-system',
  idleSystem: '/api/idle-system',
  txeInteractedTime: '/api/txe-interacted-time',
  closeAllGames: '/api/close-all-games',
  runShutdown: '/api/run-shutdown',
  runDayEnd: '/api/run-day-end',
};

export const SYSTEM_CONFIG_FIELDS = {
  txe1: 'txe1',
  txe2: 'txe2',
  adServer: 'adServer',
};

export const cleanSystemValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

export const getSystemConfiguration = (result) => {
  if (!result) {
    return {
      jurisdiction: '',
      environment: '',
      txe1: '',
      txe2: '',
      adServer: '',
      username: '',
      password: '',
      games: [],
    };
  }

  return {
    jurisdiction: cleanSystemValue(
      result.jurisdiction ??
        result.jurisdictionName
    ),

    environment: cleanSystemValue(
      result.environment ??
        result.environmentName
    ),

    txe1: cleanSystemValue(
      result.configuredTxe1 ??
        result.txe1 ??
        result.txe1Ip ??
        result.txe1IP ??
        result.txe1_ip
    ),

    txe2: cleanSystemValue(
      result.configuredTxe2 ??
        result.txe2 ??
        result.txe2Ip ??
        result.txe2IP ??
        result.txe2_ip
    ),

    adServer: cleanSystemValue(
      result.configuredAdServer ??
        result.adServer ??
        result.adServerIp ??
        result.adServerIP ??
        result.ad_server ??
        result.ad_server_ip
    ),

    username: cleanSystemValue(
      result.username
    ),

    password: cleanSystemValue(
      result.password
    ),

    games: Array.isArray(result.games)
      ? result.games
      : [],
  };
};

export const buildSystemOptions = (value) => {
  const cleaned = cleanSystemValue(value);

  return cleaned
    ? ['None', cleaned]
    : ['None'];
};
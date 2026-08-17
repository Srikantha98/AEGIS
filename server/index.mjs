import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

import {
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs';

import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const serverDirectory = dirname(fileURLToPath(import.meta.url));

const databasePath =
  process.env.PORTAL_EXCEL_PATH ||
  resolve(serverDirectory, 'data', 'portal.xlsx');

const port = Number(process.env.PORT || 5000);

const isProduction = process.env.NODE_ENV === 'production';

const tokenSecret =
  process.env.PORTAL_SESSION_SECRET ||
  (isProduction
    ? ''
    : 'development-session-secret-change-me');

const credentialKey = process.env.ENVIRONMENT_CREDENTIAL_KEY
  ? Buffer.from(process.env.ENVIRONMENT_CREDENTIAL_KEY, 'hex')
  : createHmac(
      'sha256',
      'development-environment-key'
    )
      .update('local-only')
      .digest();

if (!tokenSecret) {
  throw new Error(
    'PORTAL_SESSION_SECRET must be configured in production.'
  );
}

if (
  isProduction &&
  !process.env.ENVIRONMENT_CREDENTIAL_KEY
) {
  throw new Error(
    'ENVIRONMENT_CREDENTIAL_KEY must be configured in production.'
  );
}

if (credentialKey.length !== 32) {
  throw new Error(
    'ENVIRONMENT_CREDENTIAL_KEY must be a 64-character hexadecimal value.'
  );
}

/*
|--------------------------------------------------------------------------
| Roles
|--------------------------------------------------------------------------
*/

const roles = Object.freeze({
  ADMIN: 'ADMIN',
  TESTER: 'TESTER',
  END_USER: 'END_USER',
});

const authenticatedRoles = Object.values(roles);

/*
|--------------------------------------------------------------------------
| Jurisdiction -> Environment mapping
|--------------------------------------------------------------------------
|
| Environment is SUBORDINATE to Jurisdiction.
|
| Example:
| ME -> QA2, QA3
| ND -> QA2, DEV3
|
*/

const jurisdictionEnvironments = Object.freeze({
  AZ: Object.freeze(['QA3']),
  ME: Object.freeze(['QA2', 'QA3']),
  KS: Object.freeze(['QA3']),
  ND: Object.freeze(['QA2', 'DEV3']),
  PR: Object.freeze(['QA2', 'DEV3']),
});

const jurisdictions = Object.freeze(
  Object.keys(jurisdictionEnvironments)
);

const getEnvironmentsForJurisdiction = (jurisdiction) => {
  const normalized = normaliseJurisdiction(jurisdiction);

  return jurisdictionEnvironments[normalized] || [];
};

const isValidEnvironmentForJurisdiction = (
  jurisdiction,
  environment
) => {
  const normalizedJurisdiction =
    normaliseJurisdiction(jurisdiction);

  const normalizedEnvironment =
    cleanText(environment).toUpperCase();

  return getEnvironmentsForJurisdiction(
    normalizedJurisdiction
  ).includes(normalizedEnvironment);
};

/*
|--------------------------------------------------------------------------
| Excel columns
|--------------------------------------------------------------------------
*/

const userColumns = [
  'id',
  'username',
  'name',
  'role',
  'isActive',
  'createdAt',
  'passwordSalt',
  'passwordHash',
];

const environmentColumns = [
  'id',
  'jurisdiction',
  'name',
  'txe1',
  'txe2',
  'adServer',
  'credentials',
  'status',
  'createdBy',
  'createdAt',
  'updatedAt',
];

/*
|--------------------------------------------------------------------------
| HTTP helpers
|--------------------------------------------------------------------------
*/

const writeJson = (response, status, body) => {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });

  response.end(JSON.stringify(body));
};

const sendNoContent = (response) => {
  response.writeHead(204);
  response.end();
};

const setCors = (response) => {
  response.setHeader(
    'Access-Control-Allow-Origin',
    process.env.PORTAL_CORS_ORIGIN ||
      'http://localhost:5173'
  );

  response.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type'
  );

  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, OPTIONS'
  );
};

/*
|--------------------------------------------------------------------------
| General validation
|--------------------------------------------------------------------------
*/

const cleanText = (value) =>
  String(value ?? '').trim();

const normaliseJurisdiction = (value) =>
  cleanText(value).toUpperCase();

const normaliseEnvironment = (value) =>
  cleanText(value).toUpperCase();

const validIp = (value) => {
  const parts = cleanText(value).split('.');

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

/*
|--------------------------------------------------------------------------
| Credentials encryption
|--------------------------------------------------------------------------
*/

const encryptCredentials = ({
  username,
  password,
}) => {
  const iv = randomBytes(12);

  const cipher = createCipheriv(
    'aes-256-gcm',
    credentialKey,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(
      JSON.stringify({
        username,
        password,
      }),
      'utf8'
    ),
    cipher.final(),
  ]);

  return JSON.stringify({
    iv: iv.toString('base64'),
    tag: cipher
      .getAuthTag()
      .toString('base64'),
    value: encrypted.toString('base64'),
  });
};

const decryptCredentials = (value) => {
  if (!value) {
    throw new Error(
      'Environment credentials are not configured.'
    );
  }

  const payload = JSON.parse(value);

  const decipher = createDecipheriv(
    'aes-256-gcm',
    credentialKey,
    Buffer.from(payload.iv, 'base64')
  );

  decipher.setAuthTag(
    Buffer.from(payload.tag, 'base64')
  );

  return JSON.parse(
    Buffer.concat([
      decipher.update(
        Buffer.from(payload.value, 'base64')
      ),
      decipher.final(),
    ]).toString('utf8')
  );
};

/*
|--------------------------------------------------------------------------
| User passwords
|--------------------------------------------------------------------------
*/

const passwordRecord = (password) => {
  const salt = randomBytes(16).toString('hex');

  return {
    passwordSalt: salt,
    passwordHash: scryptSync(
      password,
      salt,
      64
    ).toString('hex'),
  };
};

const passwordMatches = (
  password,
  user
) => {
  if (
    !user.passwordHash ||
    !user.passwordSalt
  ) {
    return false;
  }

  const expected = Buffer.from(
    user.passwordHash,
    'hex'
  );

  const actual = scryptSync(
    password,
    user.passwordSalt,
    64
  );

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
};

/*
|--------------------------------------------------------------------------
| Bootstrap users
|--------------------------------------------------------------------------
*/

const bootstrapUsers = () => {
  const accounts = [
    [
      'admin',
      process.env.PORTAL_ADMIN_PASSWORD ||
        'admin123',
      'System Admin',
      roles.ADMIN,
    ],
    [
      'tester',
      process.env.PORTAL_TESTER_PASSWORD ||
        'tester123',
      'Test User',
      roles.TESTER,
    ],
    [
      'enduser',
      process.env.PORTAL_END_USER_PASSWORD ||
        'user123',
      'End User',
      roles.END_USER,
    ],
  ];

  return accounts.map(
    (
      [
        username,
        password,
        name,
        role,
      ],
      index
    ) => ({
      id: String(index + 1),
      username,
      name,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      ...passwordRecord(password),
    })
  );
};

const emptyWorkbook = () => ({
  users: bootstrapUsers(),
  environments: [],
});

/*
|--------------------------------------------------------------------------
| Excel helpers
|--------------------------------------------------------------------------
*/

const readSheet = (
  workbook,
  name
) =>
  workbook.Sheets[name]
    ? XLSX.utils.sheet_to_json(
        workbook.Sheets[name],
        {
          defval: '',
        }
      )
    : [];

const loadWorkbook = () => {
  if (!existsSync(databasePath)) {
    const workbook = emptyWorkbook();

    saveWorkbook(workbook);

    return workbook;
  }

  const file = XLSX.readFile(databasePath);

  return {
    users: readSheet(file, 'Users').map(
      (item) => ({
        ...item,
        id: String(item.id),
        isActive:
          item.isActive === true ||
          String(item.isActive).toLowerCase() ===
            'true',
      })
    ),

    environments: readSheet(
      file,
      'Environments'
    ).map((item) => ({
      ...item,

      id: String(item.id),

      jurisdiction:
        normaliseJurisdiction(
          item.jurisdiction
        ),

      name: normaliseEnvironment(
        item.name ||
          item.environment
      ),

      status: String(
        item.status || 'ACTIVE'
      ).toUpperCase(),
    })),
  };
};

const saveWorkbook = (data) => {
  mkdirSync(
    dirname(databasePath),
    {
      recursive: true,
    }
  );

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      data.users,
      {
        header: userColumns,
      }
    ),
    'Users'
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      data.environments,
      {
        header: environmentColumns,
      }
    ),
    'Environments'
  );

  const temporaryPath =
    `${databasePath}.tmp`;

  XLSX.writeFile(
    workbook,
    temporaryPath
  );

  if (existsSync(databasePath)) {
    unlinkSync(databasePath);
  }

  renameSync(
    temporaryPath,
    databasePath
  );
};

/*
|--------------------------------------------------------------------------
| Safe API responses
|--------------------------------------------------------------------------
*/

const safeUser = ({
  id,
  username,
  name,
  role,
  isActive,
}) => ({
  id,
  username,
  name,
  role,
  isActive,
});

const safeEnvironment = ({
  id,
  jurisdiction,
  name,
  txe1,
  txe2,
  adServer,
  status,
  createdAt,
  updatedAt,
  createdBy,
  credentials,
}) => ({
  id,
  jurisdiction,
  name,

  // New API field names
  txe1: cleanText(txe1),
  txe2: cleanText(txe2),
  adServer: cleanText(adServer),

  // Compatibility fields for existing frontend
  environment: name,
  txe1Ip: cleanText(txe1),
  txe2Ip: cleanText(txe2),
  adServerIp: cleanText(adServer),

  status,
  hasCredentials: Boolean(credentials),
  createdAt,
  updatedAt,
  createdBy,
});

const publicEnvironment = ({
  id,
  jurisdiction,
  name,
  status,
}) => ({
  id,
  jurisdiction,
  name,
  environment: name,
  status,
});

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

const signToken = (user) => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp:
        Date.now() +
        8 * 60 * 60 * 1000,
    })
  ).toString('base64url');

  const signature = createHmac(
    'sha256',
    tokenSecret
  )
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

const sessionFromRequest = (
  request,
  workbook
) => {
  const header =
    request.headers.authorization ||
    '';

  const token = header.startsWith(
    'Bearer '
  )
    ? header.slice(7)
    : '';

  const [
    payload,
    signature,
  ] = token.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expected = createHmac(
    'sha256',
    tokenSecret
  )
    .update(payload)
    .digest('base64url');

  if (
    signature.length !==
    expected.length
  ) {
    return null;
  }

  if (
    !timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(
        payload,
        'base64url'
      ).toString('utf8')
    );

    if (claims.exp < Date.now()) {
      return null;
    }

    const user =
      workbook.users.find(
        (item) =>
          item.id ===
            String(claims.sub) &&
          item.isActive
      );

    return user?.role === claims.role
      ? user
      : null;
  } catch {
    return null;
  }
};

const requireRole = (
  request,
  workbook,
  allowedRoles
) => {
  const user =
    sessionFromRequest(
      request,
      workbook
    );

  if (
    !user ||
    !allowedRoles.includes(
      user.role
    )
  ) {
    const error = new Error(
      'You are not authorized to perform this action.'
    );

    error.status = user ? 403 : 401;

    throw error;
  }

  return user;
};

/*
|--------------------------------------------------------------------------
| Request body
|--------------------------------------------------------------------------
*/

const parseBody = async (
  request
) => {
  const chunks = [];

  for await (
    const chunk of request
  ) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(
      Buffer.concat(chunks).toString(
        'utf8'
      )
    );
  } catch {
    const error = new Error(
      'Request body must be valid JSON.'
    );

    error.status = 400;

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| Environment validation
|--------------------------------------------------------------------------
*/

const getEnvironmentNameFromBody = (
  body
) =>
  normaliseEnvironment(
    body.environment ??
      body.name
  );

const getTxe1FromBody = (
  body
) =>
  cleanText(
    body.txe1 ??
      body.txe1Ip
  );

const getTxe2FromBody = (
  body
) =>
  cleanText(
    body.txe2 ??
      body.txe2Ip
  );

const getAdServerFromBody = (
  body
) =>
  cleanText(
    body.adServer ??
      body.adServerIp
  );

const validateEnvironment = (
  candidate,
  existing = {},
  {
    isCreate = false,
  } = {}
) => {
  const jurisdiction =
    normaliseJurisdiction(
      candidate.jurisdiction ??
        existing.jurisdiction
    );

  const name =
    getEnvironmentNameFromBody(
      candidate
    ) ||
    normaliseEnvironment(
      existing.name
    );

  const txe1 =
    getTxe1FromBody(candidate) ||
    cleanText(existing.txe1);

  const txe2 =
    getTxe2FromBody(candidate) ||
    cleanText(existing.txe2);

  const adServer =
    getAdServerFromBody(candidate) ||
    cleanText(existing.adServer);

  const status = String(
    candidate.status ??
      existing.status ??
      'ACTIVE'
  ).toUpperCase();

  /*
   * Username/password are intentionally
   * only taken from the request.
   *
   * This prevents encrypted credentials
   * from being accidentally replaced.
   */
  const username =
    candidate.username === undefined
      ? ''
      : cleanText(candidate.username);

  const password =
    candidate.password === undefined
      ? ''
      : cleanText(candidate.password);

  if (!jurisdiction) {
    const error = new Error(
      'Jurisdiction is required.'
    );

    error.status = 400;

    throw error;
  }

  if (!jurisdictions.includes(jurisdiction)) {
    const error = new Error(
      `Invalid jurisdiction "${jurisdiction}".`
    );

    error.status = 400;

    throw error;
  }

  if (!name) {
    const error = new Error(
      'Environment is required.'
    );

    error.status = 400;

    throw error;
  }

  /*
   * IMPORTANT:
   * Environment must belong to Jurisdiction.
   */
  if (
    !isValidEnvironmentForJurisdiction(
      jurisdiction,
      name
    )
  ) {
    const allowed =
      getEnvironmentsForJurisdiction(
        jurisdiction
      );

    const error = new Error(
      `Environment "${name}" is not valid for jurisdiction "${jurisdiction}". Allowed environments: ${allowed.join(
        ', '
      )}.`
    );

    error.status = 400;

    throw error;
  }

  if (
    !['ACTIVE', 'INACTIVE'].includes(
      status
    )
  ) {
    const error = new Error(
      'Environment status is invalid.'
    );

    error.status = 400;

    throw error;
  }

  /*
   * Create requires all connection values.
   */
  if (isCreate) {
    if (!txe1) {
      const error = new Error(
        'TXE1 IP is required.'
      );

      error.status = 400;

      throw error;
    }

    if (!txe2) {
      const error = new Error(
        'TXE2 IP is required.'
      );

      error.status = 400;

      throw error;
    }

    if (!adServer) {
      const error = new Error(
        'AD Server IP is required.'
      );

      error.status = 400;

      throw error;
    }

    if (!username) {
      const error = new Error(
        'Username is required.'
      );

      error.status = 400;

      throw error;
    }

    if (!password) {
      const error = new Error(
        'Password is required.'
      );

      error.status = 400;

      throw error;
    }
  }

  /*
   * Validate IP addresses when present.
   */
  for (const [
    value,
    label,
  ] of [
    [txe1, 'TXE1'],
    [txe2, 'TXE2'],
    [adServer, 'AD Server'],
  ]) {
    if (
      value &&
      !validIp(value)
    ) {
      const error = new Error(
        `${label} must be a valid IPv4 address.`
      );

      error.status = 400;

      throw error;
    }
  }

  return {
    jurisdiction,
    name,
    txe1,
    txe2,
    adServer,
    username,
    password,
    status,
  };
};

/*
|--------------------------------------------------------------------------
| Find environment
|--------------------------------------------------------------------------
*/

const environmentFromRequest = (
  workbook,
  body,
  {
    activeOnly = true,
  } = {}
) => {
  const jurisdiction =
    normaliseJurisdiction(
      body.jurisdiction
    );

  const name =
    getEnvironmentNameFromBody(
      body
    );

  if (!jurisdiction) {
    const error = new Error(
      'Jurisdiction is required.'
    );

    error.status = 400;

    throw error;
  }

  if (!name) {
    const error = new Error(
      'Environment is required.'
    );

    error.status = 400;

    throw error;
  }

  if (
    !isValidEnvironmentForJurisdiction(
      jurisdiction,
      name
    )
  ) {
    const error = new Error(
      `Environment "${name}" is not valid for jurisdiction "${jurisdiction}".`
    );

    error.status = 400;

    throw error;
  }

  const environment =
    workbook.environments.find(
      (item) =>
        item.jurisdiction ===
          jurisdiction &&
        item.name.toLowerCase() ===
          name.toLowerCase() &&
        (!activeOnly ||
          item.status ===
            'ACTIVE')
    );

  if (!environment) {
    const error = new Error(
      'The selected environment was not found.'
    );

    error.status = 404;

    throw error;
  }

  return environment;
};

/*
|--------------------------------------------------------------------------
| Selected IP validation
|--------------------------------------------------------------------------
*/

const selectedValue = (
  requested,
  configured,
  label
) => {
  const value = cleanText(
    requested
  );

  if (!value) {
    return '';
  }

  if (
    value !==
      cleanText(configured) ||
    !validIp(value)
  ) {
    const error = new Error(
      `Selected ${label} is not valid for this environment.`
    );

    error.status = 400;

    throw error;
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Winning numbers
|--------------------------------------------------------------------------
*/

const validWinningNumbers = (
  value
) =>
  /^\d+(?:[\s,/-]+\d+)*$/.test(
    value
  );

/*
|--------------------------------------------------------------------------
| Configured upstream URLs
|--------------------------------------------------------------------------
*/

const configuredUrl = (name) => {
  const value = process.env[name];

  if (!value) {
    const error = new Error(
      `${name} is not configured on the server.`
    );

    error.status = 503;

    throw error;
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Legacy GET games API
|--------------------------------------------------------------------------
*/

const callLegacyGetGames = async (
  environment,
  selection
) => {
  const credentials =
    decryptCredentials(
      environment.credentials
    );

  const url = new URL(
    configuredUrl(
      'GET_GAMES_API_URL'
    )
  );

  const parameters = {
    txe1: selection.txe1,
    txe2: selection.txe2,
    adServer:
      selection.adServer,

    Musername:
      credentials.username,

    Mpassword:
      credentials.password,
  };

  Object.entries(
    parameters
  ).forEach(
    ([key, value]) => {
      if (value) {
        url.searchParams.set(
          key,
          value
        );
      }
    }
  );

  const headers = {
    Accept: 'application/json',
  };

  if (
    process.env.LEGACY_BASIC_AUTH
  ) {
    headers.Authorization =
      `Basic ${process.env.LEGACY_BASIC_AUTH}`;
  }

  const upstream =
    await fetch(url, {
      headers,
      signal:
        AbortSignal.timeout(
          30000
        ),
    });

  if (!upstream.ok) {
    const error = new Error(
      'Unable to retrieve games for the selected Jurisdiction and Environment.'
    );

    error.status = 502;

    throw error;
  }

  const result =
    await upstream.json();

  const sourceGames =
    Array.isArray(result)
      ? result
      : result.games ||
        result.data?.games ||
        [];

  const games =
    sourceGames
      .map((game) => ({
        gameName: cleanText(
          game.gameName ??
            game.game_name ??
            game.name
        ),

        drawNumber: String(
          game.drawNumber ??
            game.drawId ??
            game.draw_id ??
            game.draw ??
            ''
        ).trim(),

        scheduledDate:
          cleanText(
            game.scheduledDate ??
              game.scheduled_date ??
              game.scheduleDate
          ),
      }))
      .filter(
        (game) =>
          game.gameName &&
          game.drawNumber
      );

  return {
    games,
  };
};

/*
|--------------------------------------------------------------------------
| Submit winning numbers
|--------------------------------------------------------------------------
*/

const submitWinningNumbers =
  async (
    environment,
    body,
    selection
  ) => {
    const games =
      Array.isArray(body.games)
        ? body.games.map(
            (game) => ({
              gameName:
                cleanText(
                  game.gameName
                ),

              drawNumber:
                cleanText(
                  game.drawNumber
                ),

              winningNumbers:
                cleanText(
                  game.winningNumbers
                ),
            })
          )
        : [];

    if (
      !games.length ||
      games.some(
        (game) =>
          !game.gameName ||
          !game.drawNumber ||
          !game.winningNumbers
      )
    ) {
      const error =
        new Error(
          'Enter a winning number for every loaded game before submitting.'
        );

      error.status = 400;

      throw error;
    }

    if (
      games.some(
        (game) =>
          !validWinningNumbers(
            game.winningNumbers
          )
      )
    ) {
      const error =
        new Error(
          'Winning numbers must contain digits separated by commas, spaces, slashes, or hyphens.'
        );

      error.status = 400;

      throw error;
    }

    const credentials =
      decryptCredentials(
        environment.credentials
      );

    const upstream =
      await fetch(
        configuredUrl(
          'WINNING_NUMBERS_API_URL'
        ),
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            ...(process.env
              .LEGACY_BASIC_AUTH
              ? {
                  Authorization:
                    `Basic ${process.env.LEGACY_BASIC_AUTH}`,
                }
              : {}),
          },

          body: JSON.stringify({
            ...selection,

            username:
              credentials.username,

            password:
              credentials.password,

            settime: cleanText(
              body.settime
            ),

            games,
          }),

          signal:
            AbortSignal.timeout(
              30000
            ),
        }
      );

    const result =
      await upstream
        .json()
        .catch(() => ({}));

    if (!upstream.ok) {
      const error = new Error(
        result.message ||
          'Unable to submit winning numbers.'
      );

      error.status = 502;

      throw error;
    }

    return {
      status:
        result.status ||
        'Success',

      message:
        result.message ||
        'Winning numbers submitted successfully.',
    };
  };

/*
|--------------------------------------------------------------------------
| HTTP request handler
|--------------------------------------------------------------------------
*/

const handleRequest = async (
  request,
  response
) => {
  setCors(response);

  if (
    request.method ===
    'OPTIONS'
  ) {
    return sendNoContent(
      response
    );
  }

  const url = new URL(
    request.url,
    `http://${
      request.headers.host ||
      'localhost'
    }`
  );

  const workbook =
    loadWorkbook();

  /*
   * ---------------------------------------------------------------
   * LOGIN
   * ---------------------------------------------------------------
   */

  if (
    request.method ===
      'POST' &&
    url.pathname ===
      '/api/auth/login'
  ) {
    const {
      username,
      password,
    } = await parseBody(
      request
    );

    const user =
      workbook.users.find(
        (item) =>
          item.username
            .toLowerCase() ===
          cleanText(
            username
          ).toLowerCase()
      );

    if (
      !user ||
      !user.isActive ||
      !passwordMatches(
        cleanText(password),
        user
      )
    ) {
      return writeJson(
        response,
        401,
        {
          message:
            'Invalid username or password.',
        }
      );
    }

    return writeJson(
      response,
      200,
      {
        user: safeUser(user),
        token: signToken(user),
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * USERS
   * ---------------------------------------------------------------
   */

  if (
    request.method ===
      'GET' &&
    url.pathname ===
      '/api/users'
  ) {
    requireRole(
      request,
      workbook,
      [roles.ADMIN]
    );

    return writeJson(
      response,
      200,
      {
        users:
          workbook.users.map(
            safeUser
          ),
      }
    );
  }

  if (
    request.method ===
      'POST' &&
    url.pathname ===
      '/api/users'
  ) {
    requireRole(
      request,
      workbook,
      [roles.ADMIN]
    );

    const body =
      await parseBody(
        request
      );

    const username =
      cleanText(
        body.username
      );

    const name =
      cleanText(
        body.name
      );

    const password =
      cleanText(
        body.password
      );

    const role =
      cleanText(
        body.role
      );

    if (
      !username ||
      !name ||
      !password ||
      !authenticatedRoles.includes(
        role
      )
    ) {
      return writeJson(
        response,
        400,
        {
          message:
            'Name, username, password, and a valid role are required.',
        }
      );
    }

    if (
      workbook.users.some(
        (item) =>
          item.username
            .toLowerCase() ===
          username.toLowerCase()
      )
    ) {
      return writeJson(
        response,
        409,
        {
          message:
            'That username is already in use.',
        }
      );
    }

    const user = {
      id: String(
        Math.max(
          0,
          ...workbook.users.map(
            (item) =>
              Number(item.id) ||
              0
          )
        ) + 1
      ),

      username,
      name,
      role,

      isActive:
        body.isActive ===
        undefined
          ? true
          : Boolean(
              body.isActive
            ),

      createdAt:
        new Date().toISOString(),

      ...passwordRecord(
        password
      ),
    };

    workbook.users.push(
      user
    );

    saveWorkbook(
      workbook
    );

    return writeJson(
      response,
      201,
      {
        user: safeUser(user),
      }
    );
  }

  const userMatch =
    url.pathname.match(
      /^\/api\/users\/([^/]+)$/
    );

  if (
    request.method ===
      'PUT' &&
    userMatch
  ) {
    requireRole(
      request,
      workbook,
      [roles.ADMIN]
    );

    const index =
      workbook.users.findIndex(
        (item) =>
          item.id ===
          decodeURIComponent(
            userMatch[1]
          )
      );

    if (index === -1) {
      return writeJson(
        response,
        404,
        {
          message:
            'User was not found.',
        }
      );
    }

    const body =
      await parseBody(
        request
      );

    workbook.users[index] = {
      ...workbook.users[index],

      ...(body.isActive ===
      undefined
        ? {}
        : {
            isActive:
              Boolean(
                body.isActive
              ),
          }),
    };

    saveWorkbook(
      workbook
    );

    return writeJson(
      response,
      200,
      {
        user: safeUser(
          workbook.users[index]
        ),
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * GET ALL ENVIRONMENTS
   * ---------------------------------------------------------------
   */

  if (
    request.method ===
      'GET' &&
    url.pathname ===
      '/api/environments'
  ) {
    requireRole(
      request,
      workbook,
      [
        roles.ADMIN,
        roles.TESTER,
      ]
    );

    return writeJson(
      response,
      200,
      {
        environments:
          workbook.environments.map(
            safeEnvironment
          ),
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * JURISDICTION / ENVIRONMENT OPTIONS
   * ---------------------------------------------------------------
   *
   * This endpoint now gives the frontend the parent-child
   * relationship directly.
   *
   * Example:
   *
   * {
   *   jurisdictions: ["AZ", "ME", ...],
   *   environmentMap: {
   *      AZ: ["QA3"],
   *      ME: ["QA2", "QA3"]
   *   },
   *   environments: [...]
   * }
   *
   */

  if (
    request.method ===
      'GET' &&
    url.pathname ===
      '/api/environment-options'
  ) {
    requireRole(
      request,
      workbook,
      authenticatedRoles
    );

    const activeEnvironments =
      workbook.environments
        .filter(
          (item) =>
            item.status ===
            'ACTIVE'
        )
        .map(
          publicEnvironment
        );

    return writeJson(
      response,
      200,
      {
        jurisdictions,
        environmentMap:
          jurisdictionEnvironments,
        environments:
          activeEnvironments,
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * CREATE ENVIRONMENT
   * ---------------------------------------------------------------
   */

  if (
    request.method ===
      'POST' &&
    url.pathname ===
      '/api/environments'
  ) {
    const user =
      requireRole(
        request,
        workbook,
        [roles.ADMIN]
      );

    const body =
      await parseBody(
        request
      );

    const environment =
      validateEnvironment(
        body,
        {},
        {
          isCreate: true,
        }
      );

    /*
     * Extra protection:
     * Only one environment of the same name
     * can exist under the same jurisdiction.
     */

    const duplicate =
      workbook.environments.some(
        (item) =>
          item.jurisdiction ===
            environment.jurisdiction &&
          item.name
            .toLowerCase() ===
            environment.name.toLowerCase()
      );

    if (duplicate) {
      return writeJson(
        response,
        409,
        {
          message:
            `That environment is already configured for jurisdiction ${environment.jurisdiction}.`,
        }
      );
    }

    const created = {
      id: String(
        Math.max(
          0,
          ...workbook.environments.map(
            (item) =>
              Number(item.id) ||
              0
          )
        ) + 1
      ),

      jurisdiction:
        environment.jurisdiction,

      name:
        environment.name,

      txe1:
        environment.txe1,

      txe2:
        environment.txe2,

      adServer:
        environment.adServer,

      credentials:
        encryptCredentials({
          username:
            environment.username,
          password:
            environment.password,
        }),

      status:
        environment.status,

      createdBy:
        user.username,

      createdAt:
        new Date().toISOString(),

      updatedAt: '',
    };

    workbook.environments.push(
      created
    );

    saveWorkbook(
      workbook
    );

    return writeJson(
      response,
      201,
      {
        environment:
          safeEnvironment(
            created
          ),
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * UPDATE ENVIRONMENT
   * ---------------------------------------------------------------
   */

  const environmentMatch =
    url.pathname.match(
      /^\/api\/environments\/([^/]+)$/
    );

  if (
    request.method ===
      'PUT' &&
    environmentMatch
  ) {
    requireRole(
      request,
      workbook,
      [roles.ADMIN]
    );

    const id =
      decodeURIComponent(
        environmentMatch[1]
      );

    const index =
      workbook.environments.findIndex(
        (item) =>
          item.id === id
      );

    if (index === -1) {
      return writeJson(
        response,
        404,
        {
          message:
            'Environment was not found.',
        }
      );
    }

    const body =
      await parseBody(
        request
      );

    const previous =
      workbook.environments[
        index
      ];

    /*
     * For update:
     *
     * - missing fields keep their old values
     * - blank password keeps old password
     * - blank username keeps old username
     */

    const updated =
      validateEnvironment(
        body,
        previous,
        {
          isCreate: false,
        }
      );

    /*
     * Check duplicate jurisdiction + environment.
     */

    const duplicate =
      workbook.environments.some(
        (
          item,
          itemIndex
        ) =>
          itemIndex !== index &&
          item.jurisdiction ===
            updated.jurisdiction &&
          item.name
            .toLowerCase() ===
            updated.name.toLowerCase()
      );

    if (duplicate) {
      return writeJson(
        response,
        409,
        {
          message:
            `That environment is already configured for jurisdiction ${updated.jurisdiction}.`,
        }
      );
    }

    /*
     * Preserve existing encrypted credentials
     * unless username or password was actually supplied.
     */

    let nextCredentials =
      previous.credentials;

    const usernameChanged =
      Boolean(
        cleanText(
          body.username
        )
      );

    const passwordChanged =
      Boolean(
        cleanText(
          body.password
        )
      );

    if (
      usernameChanged ||
      passwordChanged
    ) {
      const previousCredentials =
        decryptCredentials(
          previous.credentials
        );

      const nextUsername =
        usernameChanged
          ? cleanText(
              body.username
            )
          : previousCredentials.username;

      const nextPassword =
        passwordChanged
          ? cleanText(
              body.password
            )
          : previousCredentials.password;

      if (!nextUsername) {
        return writeJson(
          response,
          400,
          {
            message:
              'Username cannot be empty.',
          }
        );
      }

      if (!nextPassword) {
        return writeJson(
          response,
          400,
          {
            message:
              'Password cannot be empty.',
          }
        );
      }

      nextCredentials =
        encryptCredentials({
          username:
            nextUsername,
          password:
            nextPassword,
        });
    }

    /*
     * IMPORTANT:
     * Never store username/password as plain
     * properties on the environment record.
     */

    workbook.environments[
      index
    ] = {
      ...previous,

      jurisdiction:
        updated.jurisdiction,

      name:
        updated.name,

      txe1:
        updated.txe1,

      txe2:
        updated.txe2,

      adServer:
        updated.adServer,

      status:
        updated.status,

      credentials:
        nextCredentials,

      updatedAt:
        new Date().toISOString(),
    };

    saveWorkbook(
      workbook
    );

    return writeJson(
      response,
      200,
      {
        environment:
          safeEnvironment(
            workbook
              .environments[
                index
              ]
          ),
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * GET GAMES
   * ---------------------------------------------------------------
   */

  if (
    request.method ===
      'POST' &&
    url.pathname ===
      '/api/get-games'
  ) {
    requireRole(
      request,
      workbook,
      authenticatedRoles
    );

    const body =
      await parseBody(
        request
      );

    const environment =
      environmentFromRequest(
        workbook,
        body
      );

    const selection = {
      txe1:
        body.txe1 ===
        undefined
          ? cleanText(
              environment.txe1
            )
          : selectedValue(
              body.txe1,
              environment.txe1,
              'TXE1'
            ),

      txe2:
        body.txe2 ===
        undefined
          ? cleanText(
              environment.txe2
            )
          : selectedValue(
              body.txe2,
              environment.txe2,
              'TXE2'
            ),

      adServer:
        body.adServer ===
        undefined
          ? cleanText(
              environment.adServer
            )
          : selectedValue(
              body.adServer,
              environment.adServer,
              'AD Server'
            ),
    };

    const result =
      await callLegacyGetGames(
        environment,
        selection
      );

    return writeJson(
      response,
      200,
      {
        environment: {
          jurisdiction:
            environment.jurisdiction,

          name:
            environment.name,

          environment:
            environment.name,

          txe1:
            environment.txe1 ||
            '',

          txe2:
            environment.txe2 ||
            '',

          adServer:
            environment.adServer ||
            '',

          hasCredentials: true,
        },

        games:
          result.games,
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * ENTER WINNING NUMBERS
   * ---------------------------------------------------------------
   */

  if (
    request.method ===
      'POST' &&
    url.pathname ===
      '/api/enter-win-numbers'
  ) {
    requireRole(
      request,
      workbook,
      authenticatedRoles
    );

    const body =
      await parseBody(
        request
      );

    const environment =
      environmentFromRequest(
        workbook,
        body
      );

    const selection = {
      txe1:
        selectedValue(
          body.txe1,
          environment.txe1,
          'TXE1'
        ),

      txe2:
        selectedValue(
          body.txe2,
          environment.txe2,
          'TXE2'
        ),

      adServer:
        selectedValue(
          body.adServer,
          environment.adServer,
          'AD Server'
        ),
    };

    return writeJson(
      response,
      200,
      await submitWinningNumbers(
        environment,
        body,
        selection
      )
    );
  }

  /*
   * ---------------------------------------------------------------
   * NOT FOUND
   * ---------------------------------------------------------------
   */

  return writeJson(
    response,
    404,
    {
      message:
        'API endpoint was not found.',
    }
  );
};

/*
|--------------------------------------------------------------------------
| Server
|--------------------------------------------------------------------------
*/

const server =
  createServer(
    async (
      request,
      response
    ) => {
      try {
        await handleRequest(
          request,
          response
        );
      } catch (error) {
        writeJson(
          response,
          error.status || 500,
          {
            message:
              error.message ||
              'Unexpected server error.',
          }
        );
      }
    }
  );

server.listen(
  port,
  () => {
    console.log(
      `AEGIS server listening on http://localhost:${port}`
    );
  }
);
export const Roles = Object.freeze({
  ADMIN: 'ADMIN',
  TESTER: 'TESTER',
  END_USER: 'END_USER',
});

export const Permissions = Object.freeze({
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_SYSTEM_OPERATIONS: 'VIEW_SYSTEM_OPERATIONS',
  SYSTEM_STATUS: 'SYSTEM_STATUS',
  IDLE_SYSTEM: 'IDLE_SYSTEM',
  TXE_INTERACTED_TIME: 'TXE_INTERACTED_TIME',
  RUN_SYSTEM_OPERATIONS: 'RUN_SYSTEM_OPERATIONS',
  VIEW_ENVIRONMENT_OPTIONS: 'VIEW_ENVIRONMENT_OPTIONS',
  VIEW_ENVIRONMENTS: 'VIEW_ENVIRONMENTS',
  CREATE_ENVIRONMENT: 'CREATE_ENVIRONMENT',
  MANAGE_ENVIRONMENTS: 'MANAGE_ENVIRONMENTS',
  VIEW_USERS: 'VIEW_USERS',
  CREATE_USER: 'CREATE_USER',
  MANAGE_USERS: 'MANAGE_USERS',
  ADMIN_SETTINGS: 'ADMIN_SETTINGS'
});

// Each operation owns its authorization rule. Keeping this mapping next to the
// role permissions prevents callers from choosing a less restrictive
// permission when they invoke a request directly.
export const OperationPermissions = Object.freeze({
  '/api/system-status': Permissions.SYSTEM_STATUS,
  '/api/idle-system': Permissions.IDLE_SYSTEM,
  '/api/bring-up-system': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/txe-interacted-time': Permissions.TXE_INTERACTED_TIME,
  '/api/enter-win-numbers': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/close-all-games': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/run-shutdown': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/run-day-end': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/restore-rdb': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/restore-txe': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/copy-build-rdb': Permissions.RUN_SYSTEM_OPERATIONS,
  '/api/copy-build-txe': Permissions.RUN_SYSTEM_OPERATIONS,
});

export const getOperationPermission = (endpoint) =>
  OperationPermissions[endpoint] ?? null;

const operationalPermissions = [
  Permissions.VIEW_DASHBOARD,
  Permissions.VIEW_SYSTEM_OPERATIONS,
  Permissions.SYSTEM_STATUS,
  Permissions.TXE_INTERACTED_TIME,
  Permissions.VIEW_ENVIRONMENT_OPTIONS,
];

export const ROLE_PERMISSIONS = Object.freeze({
  [Roles.ADMIN]: Object.values(Permissions),
  [Roles.TESTER]: [
    ...operationalPermissions,
    Permissions.RUN_SYSTEM_OPERATIONS,
    Permissions.VIEW_ENVIRONMENTS,
  ],
  [Roles.END_USER]: operationalPermissions,
});

export const hasPermissionForRole = (role, permission) =>
  Boolean(ROLE_PERMISSIONS[role]?.includes(permission));

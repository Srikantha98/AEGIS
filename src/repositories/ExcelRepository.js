import * as XLSX from 'xlsx';
import { jurisdictionEnvironments } from '../config/jurisdictionEnvironments';

const STORAGE_KEY = 'aegis-autopro-workbook-v1';

const defaultEnvironmentOptions = Object.entries(jurisdictionEnvironments)
  .flatMap(([jurisdiction, names]) =>
    names.map((name) => ({ jurisdiction, name }))
  )
  .map(({ jurisdiction, name }, index) => ({
    id: String(index + 3),
    jurisdiction,
    name,
    description: `${jurisdiction} ${name} environment`,
    createdBy: 'admin',
    createdAt: '2026-08-10T00:00:00.000Z',
    status: 'ACTIVE',
  }));

export const seedData = Object.freeze({
  users: [
    {
      id: '1',
      username: 'admin',
      password: 'admin123',
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-08-10T00:00:00.000Z',
    },
    {
      id: '2',
      username: 'tester',
      password: 'tester123',
      name: 'Test User',
      role: 'TESTER',
      isActive: true,
      createdAt: '2026-08-10T00:00:00.000Z',
    },
    {
      id: '3',
      username: 'enduser',
      password: 'user123',
      name: 'End User',
      role: 'END_USER',
      isActive: true,
      createdAt: '2026-08-10T00:00:00.000Z',
    },
  ],
  environments: [
    {
      id: '1',
      name: 'Development',
      description: 'Development environment',
      createdBy: 'admin',
      createdAt: '2026-08-10T00:00:00.000Z',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'Testing',
      description: 'Testing environment',
      createdBy: 'admin',
      createdAt: '2026-08-10T00:00:00.000Z',
      status: 'ACTIVE',
    },
    ...defaultEnvironmentOptions,
  ],
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const normaliseBoolean = (value) =>
  value === true || String(value).toLowerCase() === 'true';

const normaliseWorkbook = (workbook) => {
  const normalisedWorkbook = {
    users: (workbook.users || []).map((user) => ({
      ...user,
      id: String(user.id),
      isActive: normaliseBoolean(user.isActive),
    })),
    environments: (workbook.environments || []).map((environment) => ({
      ...environment,
      id: String(environment.id),
      jurisdiction: String(environment.jurisdiction || '').trim().toUpperCase(),
    })),
  };

  const currentOptions = new Set(
    normalisedWorkbook.environments
      .filter((environment) => environment.jurisdiction)
      .map((environment) => `${environment.jurisdiction}:${String(environment.name).toLowerCase()}`)
  );
  let nextId = Math.max(0, ...normalisedWorkbook.environments.map((environment) => Number(environment.id) || 0)) + 1;

  Object.entries(jurisdictionEnvironments).forEach(([jurisdiction, names]) => {
    names.forEach((name) => {
      const key = `${jurisdiction}:${name.toLowerCase()}`;
      if (currentOptions.has(key)) return;
      normalisedWorkbook.environments.push({
        id: String(nextId++),
        jurisdiction,
        name,
        description: `${jurisdiction} ${name} environment`,
        createdBy: 'admin',
        createdAt: '2026-08-10T00:00:00.000Z',
        status: 'ACTIVE',
      });
    });
  });

  return normalisedWorkbook;
};

const createSeedWorkbook = () => clone(seedData);

const getDefaultStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
};

export class ExcelRepository {
  constructor({ storage = getDefaultStorage() } = {}) {
    this.storage = storage;
    this.workbook = null;
  }

  async initialize() {
    if (this.workbook) return;

    const storedWorkbook = this.storage?.getItem(STORAGE_KEY);
    if (storedWorkbook) {
      try {
        this.workbook = normaliseWorkbook(JSON.parse(storedWorkbook));
        this.persist();
        return;
      } catch {
        this.storage?.removeItem(STORAGE_KEY);
      }
    }

    this.workbook = await this.loadSeedWorkbook();
    this.persist();
  }

  async loadSeedWorkbook() {
    if (typeof fetch !== 'function') return createSeedWorkbook();

    try {
      const response = await fetch('/data/users.xlsx');
      if (!response.ok) throw new Error('Seed workbook was not found.');

      const bytes = await response.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: 'array' });
      const users = XLSX.utils.sheet_to_json(workbook.Sheets.Users, {
        defval: '',
      });
      const environments = XLSX.utils.sheet_to_json(
        workbook.Sheets.Environments,
        { defval: '' }
      );

      return normaliseWorkbook({ users, environments });
    } catch {
      return createSeedWorkbook();
    }
  }

  persist() {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.workbook));
  }

  async listUsers() {
    await this.initialize();
    return clone(this.workbook.users);
  }

  async findUserByUsername(username) {
    await this.initialize();
    const user = this.workbook.users.find(
      (item) => item.username.toLowerCase() === username.toLowerCase()
    );
    return user ? clone(user) : null;
  }

  async createUser(user) {
    await this.initialize();
    this.workbook.users.push(clone(user));
    this.persist();
    return clone(user);
  }

  async updateUser(id, changes) {
    await this.initialize();
    const index = this.workbook.users.findIndex((user) => user.id === String(id));
    if (index === -1) throw new Error('User was not found.');
    this.workbook.users[index] = {
      ...this.workbook.users[index],
      ...clone(changes),
    };
    this.persist();
    return clone(this.workbook.users[index]);
  }

  async listEnvironments() {
    await this.initialize();
    return clone(this.workbook.environments);
  }

  async createEnvironment(environment) {
    await this.initialize();
    this.workbook.environments.push(clone(environment));
    this.persist();
    return clone(environment);
  }

  async updateEnvironment(id, changes) {
    await this.initialize();
    const index = this.workbook.environments.findIndex(
      (environment) => environment.id === String(id)
    );
    if (index === -1) throw new Error('Environment was not found.');
    this.workbook.environments[index] = {
      ...this.workbook.environments[index],
      ...clone(changes),
    };
    this.persist();
    return clone(this.workbook.environments[index]);
  }

  async exportWorkbook() {
    await this.initialize();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(this.workbook.users),
      'Users'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(this.workbook.environments),
      'Environments'
    );
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }
}

export const excelRepository = new ExcelRepository();

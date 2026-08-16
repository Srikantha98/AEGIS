import * as XLSX from 'xlsx';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const users = [
  { id: '1', username: 'admin', password: 'admin123', name: 'System Admin', role: 'ADMIN', isActive: true, createdAt: '2026-08-10T00:00:00.000Z' },
  { id: '2', username: 'tester', password: 'tester123', name: 'Test User', role: 'TESTER', isActive: true, createdAt: '2026-08-10T00:00:00.000Z' },
  { id: '3', username: 'enduser', password: 'user123', name: 'End User', role: 'END_USER', isActive: true, createdAt: '2026-08-10T00:00:00.000Z' },
];

const environments = [
  { id: '1', name: 'Development', description: 'Development environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '2', name: 'Testing', description: 'Testing environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '3', jurisdiction: 'AZ', name: 'QA3', description: 'AZ QA3 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '4', jurisdiction: 'ME', name: 'QA2', description: 'ME QA2 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '5', jurisdiction: 'ME', name: 'QA3', description: 'ME QA3 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '6', jurisdiction: 'KS', name: 'QA3', description: 'KS QA3 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '7', jurisdiction: 'ND', name: 'QA2', description: 'ND QA2 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '8', jurisdiction: 'ND', name: 'DEV3', description: 'ND DEV3 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '9', jurisdiction: 'PR', name: 'QA2', description: 'PR QA2 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
  { id: '10', jurisdiction: 'PR', name: 'DEV3', description: 'PR DEV3 environment', createdBy: 'admin', createdAt: '2026-08-10T00:00:00.000Z', status: 'ACTIVE' },
];

const output = resolve('public/data/users.xlsx');
mkdirSync(dirname(output), { recursive: true });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(users), 'Users');
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(environments), 'Environments');
XLSX.writeFile(workbook, output);

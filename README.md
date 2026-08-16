# AEGIS Autopro frontend

React/Vite portal with temporary role-based authentication and environment administration.

## Run

```bash
npm install
npm run dev
```

Run checks with `npm run lint`, `npm test`, and `npm run build`.

## Development credentials

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Tester | `tester` | `tester123` |
| End User | `enduser` | `user123` |

These credentials are deliberately for development only.

## Temporary data source

`public/data/users.xlsx` contains two sheets:

- `Users`: `id`, `username`, `password`, `name`, `role`, `isActive`, `createdAt`
- `Environments`: `id`, `jurisdiction`, `name`, `description`, `createdBy`, `createdAt`, `status`

The browser reads that workbook through `ExcelRepository` on first use and saves subsequent user/environment edits in local browser storage. Admin Settings can export the current state as an Excel workbook. Regenerate the seed workbook with `node scripts/generate-workbook.mjs`.

The frontend-only project has no server process that can safely modify a static `.xlsx` file or enforce authorization against a hostile client. `AuthService`, `AuthorizationService`, `UserManagementService`, and `EnvironmentService` centralize the business rules so a future API/database repository can replace `ExcelRepository` without changing the UI. A production backend must validate the same permissions and store password hashes rather than plaintext development passwords.

The System Operations selector reads active `Environments` rows with a `jurisdiction`. Admin can add new jurisdiction/environment combinations in Environment Management; the new active option is available to every role after navigating back to System Operations.

## Roles

- `ADMIN`: all portal and management permissions.
- `TESTER`: dashboard, environments, and all existing testing operations.
- `END_USER`: dashboard, System Status, and TXE Interacted Time. Other operation buttons remain visible but disabled.

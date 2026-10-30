# Architecture rules
- Application backups use an explicit application-table allowlist and Prisma transactions behind an authenticated administrator API. Login password hashes, sessions, activation tokens and infrastructure secrets must never be exported by the application's backup API.
- Backup files are encrypted in the browser with a user-supplied password; existing destination accounts are matched by email before user references are restored.
- The production backend is Node.js with Prisma and SQLite. Authorization is enforced on the server; frontend role visibility is not an access control.
- Infrastructure backups and migration imports are offline SSH operations with restricted filesystem permissions, separate from the application backup API. Do not commit databases, uploaded files, activation links, backup contents or deployment secrets.

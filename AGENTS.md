# Architecture rules
- Application backups use allowlisted, service-only transactional database functions behind an authenticated admin Edge Function; managed authentication credentials and infrastructure secrets are never exported.
- Backup files are encrypted in the browser with a user-supplied password; existing destination accounts are matched by email before user references are restored.
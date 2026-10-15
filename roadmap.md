# Backup and restore
- [x] Add admin-only encrypted export and import in Settings.
- [x] Preserve application tables and stored files; validate user links before restore.
- [x] Verify actual encrypted export (569 records, 79 files), decryption/confirmation, and non-destructive identical-equipment restore with UI readback. Full migration to another database remains untested.

# Pending
- [ ] Preserving system login passwords when moving to a new database — hashes cannot be exported by the app; transfer of auth records must be done platform-side. Blocked on confirmation from Lovable support.
- [ ] WhatsApp delivery failing (providerStatus ERROR) — user must Disconnect (delete instance), reconnect with a new QR code, and retest.
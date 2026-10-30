#!/usr/bin/env bash
set -euo pipefail
umask 077
root=/opt/epagenda/shared
target="$root/backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$root/backups"
mkdir "$target"
# SQLite's online backup API produces a consistent copy even with WAL enabled.
sqlite3 "$root/data/epagenda.db" ".backup '$target/epagenda.db'"
sqlite3 "$target/epagenda.db" 'PRAGMA integrity_check;' | grep -qx ok
tar -czf "$target/uploads.tar.gz" -C "$root/data" uploads
cp "$root/epagenda.env" "$target/epagenda.env"
if [[ -f "$root/activation-links.csv" ]]; then cp "$root/activation-links.csv" "$target/activation-links.csv"; fi
chmod 600 "$target"/*
(cd "$target"; sha256sum epagenda.db uploads.tar.gz epagenda.env > SHA256SUMS; if [[ -f activation-links.csv ]]; then sha256sum activation-links.csv >> SHA256SUMS; fi)
printf 'Backup verified: %s\n' "$target"

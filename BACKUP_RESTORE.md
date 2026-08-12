# Backup and restore

Backup artifacts всегда остаются в ignored `.local/phase-2a-backups/` и вне Git.

- `pnpm supabase:backup-db` создаёт custom-format `pg_dump` и SHA-256 manifest; нужен `SUPABASE_DB_URL` и `pg_dump` совместимой версии.
- `pnpm supabase:backup-storage-manifest` перечисляет `catalog`, `portfolio`, `branding` server-side; нужны `SUPABASE_URL` и service role.
- `pnpm supabase:verify-backup [-- <directory>]` проверяет dump checksum и структуру manifest. Это не заменяет restore drill.

Восстановление выполняется только в новом disposable Supabase project: применить schema migrations, `pg_restore --no-owner --no-acl --clean --if-exists` для проверенного dump, загрузить Storage objects из отдельно сохранённого object archive по manifest, сверить hashes/counts, затем настроить environment variables и smoke/RLS/Auth. Service-role и DB credentials восстанавливаются из secret manager вручную, не из backup manifest. Старый проект не очищать до подписанного acceptance. Free plan automatic backup не обещается; фактическая remote backup/restore проверка остаётся ручным шагом после credentials.

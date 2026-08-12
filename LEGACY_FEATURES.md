# Legacy features after Phase 2A

Из active production runtime/navigation/build выведены: Prisma data layer, Graphile Worker and jobs, VersityGW/S3 emulator, own PostgreSQL/object server, Mailpit/passwordless flow, complex configurator, deterministic preview, AI/Polza/Gemini/SAM/Python/photo upload, customer accounts, heavy AMIGO scraping and production Docker Compose.

История сохранена в Git/tag `pre-supabase-vercel-migration`; исходные DB/storage volumes не удаляются. Старые локальные lifecycle commands доступны только как явно legacy migration/recovery aid (`legacy:dev`) и не являются prerequisite для `pnpm dev` или Vercel build. Phase 2A не начинает финальный premium redesign и не создаёт AI runtime.

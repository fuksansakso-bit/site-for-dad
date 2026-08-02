-- Synthetic recovery rehearsal only. It intentionally leaves a partial object before failing.
CREATE TABLE "migration_recovery_probe" ("id" INTEGER PRIMARY KEY);
SELECT deliberately_missing_foundation_function();

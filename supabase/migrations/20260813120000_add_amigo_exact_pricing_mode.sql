-- OWNER-DECISION-025; ADR-0015. Kept separate so PostgreSQL commits the enum value
-- before the following migration uses it in constraints and functions.
alter type public.pricing_mode add value if not exists 'AMIGO_EXACT';
